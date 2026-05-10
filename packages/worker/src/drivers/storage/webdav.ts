// WebDAV remote storage driver
// Proxies storage operations to a remote WebDAV server

import type { StorageDriver, ObjectMeta, ListOptions, PartInfo } from './base.js';

interface WebdavConfig {
  endpoint: string;
  username: string;
  password: string;
  authType?: 'basic' | 'digest';
}

export class WebdavStorageDriver implements StorageDriver {
  readonly name = 'WebDAV Remote';
  readonly driverType = 'webdav' as const;

  private config!: WebdavConfig;
  private authHeaderValue!: string;

  async init(config: Record<string, unknown>): Promise<void> {
    this.config = config as unknown as WebdavConfig;
    const credentials = `${this.config.username}:${this.config.password}`;
    this.authHeaderValue = `Basic ${btoa(credentials)}`;
  }

  private endpoint(key: string): string {
    const base = this.config.endpoint.replace(/\/$/, '');
    const path = key.startsWith('/') ? key : `/${key}`;
    return `${base}${path}`;
  }

  private headers(): Headers {
    const h = new Headers();
    h.set('Authorization', this.authHeaderValue);
    return h;
  }

  async putObject(
    key: string,
    body: ReadableStream<Uint8Array> | ArrayBuffer,
    meta?: Partial<Pick<ObjectMeta, 'mimeType'>>
  ): Promise<string> {
    const url = this.endpoint(key);
    const headers = this.headers();
    if (meta?.mimeType) {
      headers.set('Content-Type', meta.mimeType);
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: body instanceof ArrayBuffer ? body : body,
    });

    if (!response.ok) {
      throw new Error(`WebDAV putObject failed: ${response.status}`);
    }

    return response.headers.get('ETag') || '';
  }

  async getObject(key: string): Promise<{ body: ReadableStream<Uint8Array>; meta: ObjectMeta }> {
    const url = this.endpoint(key);
    const response = await fetch(url, { method: 'GET', headers: this.headers() });

    if (!response.ok) {
      throw new Error(`WebDAV getObject failed: ${response.status}`);
    }

    const meta: ObjectMeta = {
      key,
      size: parseInt(response.headers.get('Content-Length') || '0', 10),
      mimeType: response.headers.get('Content-Type') || 'application/octet-stream',
      lastModified: new Date(response.headers.get('Last-Modified') || Date.now()),
      etag: response.headers.get('ETag') || undefined,
    };

    if (!response.body) {
      throw new Error('WebDAV getObject: response body is null');
    }

    return { body: response.body, meta };
  }

  async headObject(key: string): Promise<ObjectMeta> {
    const url = this.endpoint(key);
    const response = await fetch(url, { method: 'HEAD', headers: this.headers() });

    if (!response.ok) {
      throw new Error(`WebDAV headObject failed: ${response.status}`);
    }

    return {
      key,
      size: parseInt(response.headers.get('Content-Length') || '0', 10),
      mimeType: response.headers.get('Content-Type') || 'application/octet-stream',
      lastModified: new Date(response.headers.get('Last-Modified') || Date.now()),
      etag: response.headers.get('ETag') || undefined,
    };
  }

  async deleteObject(key: string): Promise<void> {
    const url = this.endpoint(key);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.headers(),
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`WebDAV deleteObject failed: ${response.status}`);
    }
  }

  async listObjects(prefix: string, opts?: ListOptions): Promise<ObjectMeta[]> {
    const url = this.endpoint(prefix);
    const headers = this.headers();
    headers.set('Depth', opts?.maxKeys ? '1' : '1');

    const body = `<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:">
  <prop>
    <resourcetype/>
    <getcontentlength/>
    <getcontenttype/>
    <getlastmodified/>
    <getetag/>
  </prop>
</propfind>`;

    const response = await fetch(url, {
      method: 'PROPFIND',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`WebDAV listObjects failed: ${response.status}`);
    }

    const xml = await response.text();
    return this.parsePropfindResponse(xml, prefix);
  }

  // Presigned URLs — not natively supported by WebDAV, return direct URL with auth in query (for limited cases)
  async getPresignedUploadUrl(key: string, _expiresIn: number): Promise<string> {
    return this.endpoint(key);
  }

  async getPresignedDownloadUrl(key: string, _expiresIn: number): Promise<string> {
    return this.endpoint(key);
  }

  // Multipart upload — not supported by standard WebDAV, fall back to single PUT
  async createMultipartUpload(_key: string): Promise<string> {
    return 'webdav-single-part';
  }

  async getPresignedPartUrl(
    _key: string,
    _uploadId: string,
    _partNumber: number
  ): Promise<string> {
    throw new Error('Multipart upload not supported for WebDAV driver');
  }

  async completeMultipartUpload(
    _key: string,
    _uploadId: string,
    _parts: PartInfo[]
  ): Promise<void> {
    // No-op: WebDAV uses single-part upload via putObject
  }

  async abortMultipartUpload(_key: string, _uploadId: string): Promise<void> {
    // No-op
  }

  // ==============================
  // Private helpers
  // ==============================

  private parsePropfindResponse(xml: string, prefix: string): ObjectMeta[] {
    const objects: ObjectMeta[] = [];
    const responseRegex = /<D:response>([\s\S]*?)<\/D:response>/g;
    let match;

    while ((match = responseRegex.exec(xml)) !== null) {
      const entry = match[1];
      const href = this.extractTag(entry, 'D:href');
      if (!href || href.endsWith('/') || href === prefix || href === `/${prefix}`) continue;

      objects.push({
        key: href,
        size: parseInt(this.extractTag(entry, 'D:getcontentlength') || '0', 10),
        mimeType: this.extractTag(entry, 'D:getcontenttype') || 'application/octet-stream',
        lastModified: new Date(
          this.extractTag(entry, 'D:getlastmodified') || Date.now()
        ),
        etag: this.extractTag(entry, 'D:getetag') || undefined,
      });
    }

    return objects;
  }

  private extractTag(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}[^>]*>(.+?)<\\/${tag}>`));
    return match ? match[1] : '';
  }
}
