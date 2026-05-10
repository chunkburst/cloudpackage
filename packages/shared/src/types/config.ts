// Configuration types

export interface S3StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle?: boolean;
}

export interface WebdavStorageConfig {
  endpoint: string;
  username: string;
  password: string;
  authType?: 'basic' | 'digest';
}

export interface LocalStorageConfig {
  basePath: string;
}

export type StorageConfigJson = S3StorageConfig | WebdavStorageConfig | LocalStorageConfig;

export interface AppConfig {
  corsOrigins: string[];
  rateLimitMax: number;
  maxFileSizeGb: number;
  chunkSizeMb: number;
  jwtExpiryHours: number;
  defaultTheme: string;
}
