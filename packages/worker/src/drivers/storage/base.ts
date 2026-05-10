// Abstract storage driver interface

export interface ObjectMeta {
  key: string;
  size: number;
  mimeType: string;
  checksum?: string;
  lastModified: Date;
  etag?: string;
}

export interface ListOptions {
  maxKeys?: number;
  delimiter?: string;
  startAfter?: string;
}

export interface PartInfo {
  partNumber: number;
  etag: string;
}

export interface PresignedUploadResult {
  url: string;
  fields?: Record<string, string>;
}

export interface StorageDriver {
  readonly name: string;
  readonly driverType: 's3' | 'webdav' | 'local';

  init(config: Record<string, unknown>): Promise<void>;

  // Core CRUD
  putObject(
    key: string,
    body: ReadableStream<Uint8Array> | ArrayBuffer,
    meta?: Partial<Pick<ObjectMeta, 'mimeType' | 'size'>>
  ): Promise<string>;

  getObject(key: string): Promise<{ body: ReadableStream<Uint8Array>; meta: ObjectMeta }>;

  headObject(key: string): Promise<ObjectMeta>;

  deleteObject(key: string): Promise<void>;

  listObjects(prefix: string, opts?: ListOptions): Promise<ObjectMeta[]>;

  // Presigned URLs
  getPresignedUploadUrl(key: string, expiresIn: number): Promise<string>;

  getPresignedDownloadUrl(key: string, expiresIn: number): Promise<string>;

  // Multipart upload
  createMultipartUpload(key: string): Promise<string>;

  getPresignedPartUrl(
    key: string,
    uploadId: string,
    partNumber: number
  ): Promise<string>;

  completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: PartInfo[]
  ): Promise<void>;

  abortMultipartUpload(key: string, uploadId: string): Promise<void>;
}
