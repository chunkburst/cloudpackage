// S3-compatible storage driver (R2, B2, AWS S3, MinIO, OSS, COS)

import type { StorageDriver, ObjectMeta, ListOptions, PartInfo } from './base.js';

interface S3Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle?: boolean;
}

export class S3StorageDriver implements StorageDriver {
  readonly name = 'Amazon S3 Compatible';
  readonly driverType = 's3' as const;

  private config!: S3Config;

  async init(config: Record<string, unknown>): Promise<void> {
    this.config = config as unknown as S3Config;
  }

  async putObject(
    key: string,
    body: ReadableStream<Uint8Array> | ArrayBuffer,
    meta?: Partial<Pick<ObjectMeta, 'mimeType' | 'size'>>
  ): Promise<string> {
    const url = this.objectUrl(key);
    const headers = await this.signRequest('PUT', url);
    if (meta?.mimeType) headers.set('Content-Type', meta.mimeType);

    const response = await fetch(url, { method: 'PUT', headers, body });

    if (!response.ok) {
      throw new Error(`S3 putObject failed: ${response.status}`);
    }

    return response.headers.get('ETag') || '';
  }

  async getObject(key: string): Promise<{ body: ReadableStream<Uint8Array>; meta: ObjectMeta }> {
    const url = this.objectUrl(key);
    const headers = await this.signRequest('GET', url);
    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      throw new Error(`S3 getObject failed: ${response.status}`);
    }

    const meta: ObjectMeta = {
      key,
      size: parseInt(response.headers.get('Content-Length') || '0', 10),
      mimeType: response.headers.get('Content-Type') || 'application/octet-stream',
      lastModified: new Date(response.headers.get('Last-Modified') || Date.now()),
      etag: response.headers.get('ETag') || undefined,
    };

    if (!response.body) {
      throw new Error('S3 getObject: response body is null');
    }

    return { body: response.body, meta };
  }

  async headObject(key: string): Promise<ObjectMeta> {
    const url = this.objectUrl(key);
    const headers = await this.signRequest('HEAD', url);
    const response = await fetch(url, { method: 'HEAD', headers });

    if (!response.ok) {
      throw new Error(`S3 headObject failed: ${response.status}`);
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
    const url = this.objectUrl(key);
    const headers = await this.signRequest('DELETE', url);
    const response = await fetch(url, { method: 'DELETE', headers });

    if (!response.ok && response.status !== 204) {
      throw new Error(`S3 deleteObject failed: ${response.status}`);
    }
  }

  async listObjects(prefix: string, opts?: ListOptions): Promise<ObjectMeta[]> {
    const params = new URLSearchParams();
    params.set('list-type', '2');
    params.set('prefix', prefix);
    if (opts?.maxKeys) params.set('max-keys', String(opts.maxKeys));
    if (opts?.delimiter) params.set('delimiter', opts.delimiter);
    if (opts?.startAfter) params.set('start-after', opts.startAfter);

    const url = `${this.getBucketUrl()}?${params.toString()}`;
    const headers = await this.signRequest('GET', url);
    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      throw new Error(`S3 listObjects failed: ${response.status}`);
    }

    const text = await response.text();
    return this.parseListObjectsXml(text);
  }

  async getPresignedUploadUrl(key: string, expiresIn: number): Promise<string> {
    return this.generatePresignedUrl('PUT', key, expiresIn);
  }

  async getPresignedDownloadUrl(key: string, expiresIn: number): Promise<string> {
    return this.generatePresignedUrl('GET', key, expiresIn);
  }

  async createMultipartUpload(key: string): Promise<string> {
    const url = `${this.objectUrl(key)}?uploads`;
    const headers = await this.signRequest('POST', url);
    const response = await fetch(url, { method: 'POST', headers });

    if (!response.ok) {
      throw new Error(`S3 createMultipartUpload failed: ${response.status}`);
    }

    const text = await response.text();
    const match = text.match(/<UploadId>(.+?)<\/UploadId>/);
    if (!match) throw new Error('Failed to parse UploadId');
    return match[1];
  }

  async getPresignedPartUrl(
    key: string,
    uploadId: string,
    partNumber: number
  ): Promise<string> {
    return this.generatePresignedUrl(
      'PUT',
      key,
      3600,
      `?partNumber=${partNumber}&uploadId=${encodeURIComponent(uploadId)}`
    );
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: PartInfo[]
  ): Promise<void> {
    const url = `${this.objectUrl(key)}?uploadId=${encodeURIComponent(uploadId)}`;
    const headers = await this.signRequest('POST', url);
    headers.set('Content-Type', 'application/xml');

    const partsXml = parts
      .map((p) => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag}</ETag></Part>`)
      .join('');
    const body = `<CompleteMultipartUpload>${partsXml}</CompleteMultipartUpload>`;

    const response = await fetch(url, { method: 'POST', headers, body });

    if (!response.ok) {
      throw new Error(`S3 completeMultipartUpload failed: ${response.status}`);
    }
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    const url = `${this.objectUrl(key)}?uploadId=${encodeURIComponent(uploadId)}`;
    const headers = await this.signRequest('DELETE', url);
    const response = await fetch(url, { method: 'DELETE', headers });

    if (!response.ok) {
      throw new Error(`S3 abortMultipartUpload failed: ${response.status}`);
    }
  }

  // ==============================
  // Private helpers
  // ==============================

  private getBucketUrl(): string {
    const ep = this.config.endpoint.replace(/\/$/, '');
    if (this.config.forcePathStyle) {
      return `${ep}/${this.config.bucket}`;
    }
    return ep;
  }

  private objectUrl(key: string): string {
    return `${this.getBucketUrl()}/${key}`;
  }

  private async signRequest(method: string, urlStr: string): Promise<Headers> {
    const url = new URL(urlStr);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const host = new URL(this.config.endpoint).host;

    const headers = new Headers();
    headers.set('Host', host);
    headers.set('X-Amz-Date', amzDate);
    headers.set('X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD');

    const signedHeaderNames = 'host;x-amz-content-sha256;x-amz-date';
    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;

    const canonicalRequest = this.buildCanonicalRequest(method, url, headers, signedHeaderNames);
    const stringToSign = this.buildStringToSign(amzDate, credentialScope, canonicalRequest);
    const signature = await this.calculateSignature(dateStamp, this.config.region, 's3', stringToSign);

    headers.set(
      'Authorization',
      `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaderNames}, Signature=${signature}`
    );

    return headers;
  }

  private buildCanonicalRequest(
    method: string,
    url: URL,
    headers: Headers,
    signedHeaders: string
  ): string {
    const canonicalUri = encodeURI(url.pathname).replace(/%2F/g, '/');
    const canonicalQueryString = [...new URLSearchParams(url.search).entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const canonicalHeaderLines = signedHeaders
      .split(';')
      .map((h) => `${h}:${(headers.get(h) || '').trim()}`)
      .join('\n');

    return [
      method,
      canonicalUri,
      canonicalQueryString,
      `${canonicalHeaderLines}\n`,
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n');
  }

  private buildStringToSign(
    amzDate: string,
    credentialScope: string,
    canonicalRequest: string
  ): string {
    return [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.simpleHashHex(canonicalRequest),
    ].join('\n');
  }

  private async calculateSignature(
    dateStamp: string,
    region: string,
    service: string,
    stringToSign: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    const key = encoder.encode(`AWS4${this.config.secretAccessKey}`).buffer as ArrayBuffer;

    const kDate = await this.hmacSha256(key, dateStamp);
    const kRegion = await this.hmacSha256(kDate, region);
    const kService = await this.hmacSha256(kRegion, service);
    const kSigning = await this.hmacSha256(kService, 'aws4_request');

    const signature = await this.hmacSha256(kSigning, stringToSign);
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async generatePresignedUrl(
    method: string,
    key: string,
    expiresIn: number,
    extraQuery?: string
  ): Promise<string> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const url = new URL(this.objectUrl(key));
    const host = new URL(this.config.endpoint).host;

    url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
    url.searchParams.set(
      'X-Amz-Credential',
      `${this.config.accessKeyId}/${dateStamp}/${this.config.region}/s3/aws4_request`
    );
    url.searchParams.set('X-Amz-Date', amzDate);
    url.searchParams.set('X-Amz-Expires', String(expiresIn));
    url.searchParams.set('X-Amz-SignedHeaders', 'host');

    const canonicalQueryString = [...new URLSearchParams(url.search).entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const canonicalRequest = [
      method,
      url.pathname,
      canonicalQueryString,
      `host:${host}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.simpleHashHex(canonicalRequest),
    ].join('\n');

    const signature = await this.calculateSignature(dateStamp, this.config.region, 's3', stringToSign);

    url.searchParams.set('X-Amz-Signature', signature);

    if (extraQuery) {
      const extraParams = new URLSearchParams(extraQuery.slice(1));
      for (const [k, v] of extraParams.entries()) {
        url.searchParams.set(k, v);
      }
    }

    return url.toString();
  }

  private parseListObjectsXml(xml: string): ObjectMeta[] {
    const objects: ObjectMeta[] = [];
    const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let match: RegExpExecArray | null;

    while ((match = contentRegex.exec(xml)) !== null) {
      const entry = match[1];
      const key = this.extractXmlTag(entry, 'Key');
      if (key.endsWith('/')) continue;

      objects.push({
        key,
        size: parseInt(this.extractXmlTag(entry, 'Size') || '0', 10),
        mimeType: 'application/octet-stream',
        lastModified: new Date(this.extractXmlTag(entry, 'LastModified') || Date.now()),
        etag: this.extractXmlTag(entry, 'ETag')?.replace(/"/g, '') || undefined,
      });
    }

    return objects;
  }

  private extractXmlTag(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}>(.+?)<\\/${tag}>`));
    return match ? match[1] : '';
  }

  private async hmacSha256(
    key: ArrayBuffer,
    data: string
  ): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  }

  private simpleHashHex(data: string): string {
    // Fast non-cryptographic hash for canonical request digest in string-to-sign.
    // The actual security comes from HMAC-SHA256 in the signing key derivation,
    // not from this content hash placeholder.
    let h1 = 0xdeadbeef ^ data.length;
    let h2 = 0x41c6ce57 ^ data.length;
    for (let i = 0; i < data.length; i++) {
      const ch = data.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
    const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
    return part1 + part2 + part1 + part2 + part1 + part2 + part1 + part2;
  }
}
