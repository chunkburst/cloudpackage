import type { StorageDriver, ObjectMeta, ListOptions, PartInfo } from './base.js';
import { StorageError } from '@cloudpackage/shared';

export class R2StorageDriver implements StorageDriver {
  readonly name = 'Cloudflare R2 Binding';
  readonly driverType = 'r2' as const;

  private bucket!: R2Bucket;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  async init(_config: Record<string, unknown>): Promise<void> {}

  async putObject(
    key: string,
    body: ReadableStream<Uint8Array> | ArrayBuffer,
    meta?: Partial<Pick<ObjectMeta, 'mimeType' | 'size'>>
  ): Promise<string> {
    const object = await this.bucket.put(key, body, {
      httpMetadata: meta?.mimeType ? { contentType: meta.mimeType } : undefined,
    });
    return object.etag;
  }

  async getObject(key: string): Promise<{ body: ReadableStream<Uint8Array>; meta: ObjectMeta }> {
    const object = await this.bucket.get(key);
    if (!object?.body) {
      throw new StorageError(`Object not found: ${key}`);
    }

    return {
      body: object.body,
      meta: this.toMeta(key, object),
    };
  }

  async headObject(key: string): Promise<ObjectMeta> {
    const object = await this.bucket.head(key);
    if (!object) {
      throw new StorageError(`Object not found: ${key}`);
    }

    return this.toMeta(key, object);
  }

  async deleteObject(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  async listObjects(prefix: string, opts?: ListOptions): Promise<ObjectMeta[]> {
    const listed = await this.bucket.list({
      prefix,
      limit: opts?.maxKeys,
      delimiter: opts?.delimiter,
      startAfter: opts?.startAfter,
    });

    return listed.objects.map((object) => this.toMeta(object.key, object));
  }

  async getPresignedUploadUrl(_key: string, _expiresIn: number): Promise<string> {
    throw new StorageError('Presigned upload URLs are not supported by the R2 binding driver');
  }

  async getPresignedDownloadUrl(_key: string, _expiresIn: number): Promise<string> {
    throw new StorageError('Presigned download URLs are not supported by the R2 binding driver');
  }

  async createMultipartUpload(_key: string): Promise<string> {
    throw new StorageError('Multipart upload is not supported by the R2 binding driver');
  }

  async getPresignedPartUrl(
    _key: string,
    _uploadId: string,
    _partNumber: number
  ): Promise<string> {
    throw new StorageError('Multipart upload is not supported by the R2 binding driver');
  }

  async completeMultipartUpload(
    _key: string,
    _uploadId: string,
    _parts: PartInfo[]
  ): Promise<void> {
    throw new StorageError('Multipart upload is not supported by the R2 binding driver');
  }

  async abortMultipartUpload(_key: string, _uploadId: string): Promise<void> {}

  private toMeta(key: string, object: R2Object): ObjectMeta {
    return {
      key,
      size: object.size,
      mimeType: object.httpMetadata?.contentType || 'application/octet-stream',
      checksum: object.checksums.md5 ? this.hex(object.checksums.md5) : undefined,
      lastModified: object.uploaded,
      etag: object.etag,
    };
  }

  private hex(bytes: ArrayBuffer): string {
    return Array.from(new Uint8Array(bytes))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}
