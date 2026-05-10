// Local filesystem storage driver (Docker/non-Edge only)
// Uses dynamic imports of Node.js fs/path — only works in non-Edge environments.

import type { StorageDriver, ObjectMeta, ListOptions, PartInfo } from './base.js';

interface LocalConfig {
  basePath: string;
}

export class LocalStorageDriver implements StorageDriver {
  readonly name = 'Local Filesystem';
  readonly driverType = 'local' as const;

  private config!: LocalConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private fs: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pathModule: any;

  async init(config: Record<string, unknown>): Promise<void> {
    this.config = config as unknown as LocalConfig;

    try {
      // @ts-expect-error — Node.js modules only available in Docker deployment
      this.fs = await import('node:fs/promises');
      // @ts-expect-error — Node.js modules only available in Docker deployment
      this.pathModule = await import('node:path');
    } catch {
      throw new Error(
        'LocalStorageDriver can only be used in Node.js environments (Docker deployment)'
      );
    }
  }

  private resolvePath(key: string): string {
    const normalizedKey = key.startsWith('/') ? key.slice(1) : key;
    return this.pathModule.join(this.config.basePath, normalizedKey);
  }

  async putObject(
    key: string,
    body: ReadableStream<Uint8Array> | ArrayBuffer,
    _meta?: Partial<Pick<ObjectMeta, 'mimeType'>>
  ): Promise<string> {
    const filePath = this.resolvePath(key);
    await this.fs.mkdir(this.pathModule.dirname(filePath), { recursive: true });

    if (body instanceof ReadableStream) {
      const reader = body.getReader();
      const chunks: Uint8Array[] = [];
      let result: ReadableStreamReadResult<Uint8Array>;
      while (!(result = await reader.read()).done) {
        chunks.push(result.value);
      }
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const buffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }
      await this.fs.writeFile(filePath, buffer);
    } else {
      await this.fs.writeFile(filePath, new Uint8Array(body));
    }

    return '';
  }

  async getObject(key: string): Promise<{ body: ReadableStream<Uint8Array>; meta: ObjectMeta }> {
    const filePath = this.resolvePath(key);
    const stat = await this.fs.stat(filePath);
    const data: Uint8Array = await this.fs.readFile(filePath);

    const meta: ObjectMeta = {
      key,
      size: stat.size,
      mimeType: 'application/octet-stream',
      lastModified: stat.mtime,
    };

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      },
    });

    return { body: stream, meta };
  }

  async headObject(key: string): Promise<ObjectMeta> {
    const filePath = this.resolvePath(key);
    const stat = await this.fs.stat(filePath);

    return {
      key,
      size: stat.size,
      mimeType: 'application/octet-stream',
      lastModified: stat.mtime,
    };
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    await this.fs.unlink(filePath);
  }

  async listObjects(prefix: string, _opts?: ListOptions): Promise<ObjectMeta[]> {
    const dirPath = this.resolvePath(prefix);
    const objects: ObjectMeta[] = [];

    try {
      const entries = await this.fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile()) {
          const fullPath = this.pathModule.join(dirPath, entry.name);
          const stat = await this.fs.stat(fullPath);
          objects.push({
            key: prefix ? `${prefix}/${entry.name}` : entry.name,
            size: stat.size,
            mimeType: 'application/octet-stream',
            lastModified: stat.mtime,
          });
        }
      }
    } catch {
      // Directory doesn't exist or is empty
    }

    return objects;
  }

  async getPresignedUploadUrl(_key: string, _expiresIn: number): Promise<string> {
    return '';
  }

  async getPresignedDownloadUrl(_key: string, _expiresIn: number): Promise<string> {
    return '';
  }

  async createMultipartUpload(_key: string): Promise<string> {
    return 'local-single-part';
  }

  async getPresignedPartUrl(
    _key: string,
    _uploadId: string,
    _partNumber: number
  ): Promise<string> {
    throw new Error('Multipart upload not supported for local driver');
  }

  async completeMultipartUpload(
    _key: string,
    _uploadId: string,
    _parts: PartInfo[]
  ): Promise<void> {}

  async abortMultipartUpload(_key: string, _uploadId: string): Promise<void> {}
}
