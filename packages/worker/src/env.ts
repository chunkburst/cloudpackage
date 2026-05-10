export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  COLLABORATION: DurableObjectNamespace;
  UPLOAD_SESSION: DurableObjectNamespace;
  JWT_SECRET: string;
  API_KEY_ENCRYPTION_KEY: string;
  S3_ENDPOINTS: string;
  CORS_ORIGINS: string;
  RATE_LIMIT_MAX: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
}
