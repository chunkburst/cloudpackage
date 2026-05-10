// Upload Session Durable Object
// Tracks chunked upload progress for resumable file uploads.
// Coordinates multipart uploads to S3-compatible storage.

import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../env.js';

interface UploadState {
  fileId: string;
  userId: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: Set<number>;
  uploadId: string;
  etags: Record<number, string>;
  mimeType: string;
  fileName: string;
  startedAt: number;
}

export class UploadSession extends DurableObject {
  private state: UploadState | null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.state = null;

    void ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<UploadState>('state');
      if (saved) {
        // Restore Set from JSON array
        this.state = {
          ...saved,
          uploadedChunks: new Set(saved.uploadedChunks as unknown as number[]),
        };
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      if (method === 'POST' && path.endsWith('/init')) {
        return await this.handleInit(request);
      }
      if (method === 'GET' && path.endsWith('/status')) {
        return this.handleStatus();
      }
      if (method === 'POST' && path.includes('/chunk/')) {
        const chunkNumber = parseInt(path.split('/chunk/')[1], 10);
        return await this.handleChunkComplete(chunkNumber, request);
      }
      if (method === 'POST' && path.endsWith('/complete')) {
        return await this.handleComplete();
      }
      if (method === 'POST' && path.endsWith('/abort')) {
        return await this.handleAbort();
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: err instanceof Error ? err.message : 'Upload error',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  async alarm(): Promise<void> {
    // Auto-cleanup after 24 hours of inactivity
    if (this.state) {
      const idleTime = Date.now() - (this.state.startedAt || 0);
      if (idleTime > 86400000) {
        await this.ctx.storage.deleteAll();
        this.state = null;
      }
    }
  }

  // ==============================
  // Handlers
  // ==============================

  private async handleInit(request: Request): Promise<Response> {
    const body = await request.json() as {
      fileId: string;
      userId: string;
      totalSize: number;
      chunkSize: number;
      mimeType: string;
      fileName: string;
    };

    this.state = {
      fileId: body.fileId,
      userId: body.userId,
      totalSize: body.totalSize,
      chunkSize: body.chunkSize,
      totalChunks: Math.ceil(body.totalSize / body.chunkSize),
      uploadedChunks: new Set(),
      uploadId: `upload_${crypto.randomUUID()}`,
      etags: {},
      mimeType: body.mimeType,
      fileName: body.fileName,
      startedAt: Date.now(),
    };

    // Persist initial state
    await this.ctx.storage.put('state', {
      ...this.state,
      uploadedChunks: Array.from(this.state.uploadedChunks),
    });

    // Set alarm for 24h cleanup
    await this.ctx.storage.setAlarm(Date.now() + 86400000);

    return new Response(
      JSON.stringify({
        sessionId: this.ctx.id.toString(),
        uploadId: this.state.uploadId,
        totalChunks: this.state.totalChunks,
        chunkSize: this.state.chunkSize,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  private handleStatus(): Response {
    if (!this.state) {
      return new Response(
        JSON.stringify({ error: 'No active upload session' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const missingChunks: number[] = [];
    for (let i = 0; i < this.state.totalChunks; i++) {
      if (!this.state.uploadedChunks.has(i)) {
        missingChunks.push(i);
      }
    }

    return new Response(
      JSON.stringify({
        totalChunks: this.state.totalChunks,
        uploadedChunks: this.state.uploadedChunks.size,
        missingChunks,
        progress: Math.round(
          (this.state.uploadedChunks.size / this.state.totalChunks) * 100
        ),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  private async handleChunkComplete(
    chunkNumber: number,
    request: Request
  ): Promise<Response> {
    if (!this.state) {
      return new Response(
        JSON.stringify({ error: 'No active upload session' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json() as { etag: string };

    this.state.uploadedChunks.add(chunkNumber);
    this.state.etags[chunkNumber] = body.etag;

    // Persist state
    await this.ctx.storage.put('state', {
      ...this.state,
      uploadedChunks: Array.from(this.state.uploadedChunks),
    });

    return new Response(
      JSON.stringify({
        chunk: chunkNumber,
        uploaded: this.state.uploadedChunks.size,
        total: this.state.totalChunks,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  private async handleComplete(): Promise<Response> {
    if (!this.state) {
      return new Response(
        JSON.stringify({ error: 'No active upload session' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify all chunks are uploaded
    if (this.state.uploadedChunks.size !== this.state.totalChunks) {
      const missing = this.state.totalChunks - this.state.uploadedChunks.size;
      return new Response(
        JSON.stringify({ error: `Upload incomplete: ${missing} chunks missing` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sort parts by chunk number
    const parts = Object.entries(this.state.etags)
      .map(([partNum, etag]) => ({
        partNumber: parseInt(partNum, 10) + 1, // S3 parts are 1-indexed
        etag,
      }))
      .sort((a, b) => a.partNumber - b.partNumber);

    const uploadId = this.state.uploadId;

    // Clean up DO state
    await this.ctx.storage.deleteAll();
    this.state = null;

    return new Response(
      JSON.stringify({
        status: 'complete',
        uploadId,
        parts,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  private async handleAbort(): Promise<Response> {
    if (this.state) {
      await this.ctx.storage.deleteAll();
      this.state = null;
    }

    return new Response(
      JSON.stringify({ status: 'aborted' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}
