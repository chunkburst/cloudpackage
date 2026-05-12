// Magic values, enums, and limits for CloudPackage

// File / upload limits
export const MAX_FILE_SIZE_MB = 5000;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const CHUNK_SIZE_MB = 50;
export const CHUNK_SIZE_BYTES = CHUNK_SIZE_MB * 1024 * 1024;
export const MAX_CONCURRENT_CHUNKS = 3;

// Auth
export const JWT_EXPIRY_HOURS = 24;
export const JWT_EXPIRY_SECONDS = JWT_EXPIRY_HOURS * 3600;
export const API_KEY_PREFIX = 'cpk_';
export const API_KEY_LENGTH = 48;

// Rate limiting
export const RATE_LIMIT_WINDOW_SECONDS = 60;
export const RATE_LIMIT_DEFAULT_MAX = 100;

// WebDAV
export const WEBDAV_CACHE_TTL_SECONDS = 300;
export const WEBDAV_MAX_DEPTH = 3;

// Search
export const SEARCH_MAX_RESULTS = 100;
export const SEARCH_SUGGESTIONS_MAX = 10;

// Share links
export const SHARE_TOKEN_LENGTH = 32;
export const SHARE_MAX_ACCESSES_DEFAULT = 100;
export const SHARE_LINK_EXPIRY_DAYS_MAX = 365;

// Preview
export const PREVIEW_MAX_FILE_SIZE_MB = 100;
export const PREVIEW_MAX_FILE_SIZE_BYTES = PREVIEW_MAX_FILE_SIZE_MB * 1024 * 1024;

// Collaboration
export const COLLAB_HEARTBEAT_INTERVAL_MS = 30000;
export const COLLAB_MAX_ACTIVE_USERS = 50;

// Pagination
export const PAGINATION_DEFAULT_PAGE = 1;
export const PAGINATION_DEFAULT_PAGE_SIZE = 50;
export const PAGINATION_MAX_PAGE_SIZE = 200;

// MIME types for preview support
export const PREVIEW_SUPPORTED_MIME_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'image/bmp', 'image/tiff', 'image/avif',
  // Video
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
  // Audio
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/flac', 'audio/aac',
  // Documents
  'application/pdf',
  // Office
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Code / text
  'text/plain', 'text/html', 'text/css', 'text/javascript',
  'text/xml', 'application/json', 'text/markdown',
  'application/xml', 'text/yaml', 'text/x-python',
  'text/x-java', 'text/x-c', 'text/x-c++', 'text/x-go',
  'text/x-rust', 'application/x-sh',
  // Ebooks
  'application/epub+zip', 'application/x-mobipocket-ebook',
  // Archives
  'application/zip', 'application/x-rar-compressed',
  'application/x-7z-compressed', 'application/gzip',
]);

// Storage drivers
export const STORAGE_DRIVERS = ['s3', 'webdav', 'local', 'r2'] as const;
export type StorageDriverType = (typeof STORAGE_DRIVERS)[number];

// User roles
export const USER_ROLES = ['admin', 'user', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// File visibility
export const FILE_VISIBILITY = ['private', 'shared', 'public'] as const;
export type FileVisibility = (typeof FILE_VISIBILITY)[number];

// Task types
export const TASK_TYPES = ['cleanup', 'sync', 'reindex', 'healthcheck'] as const;
export type TaskType = (typeof TASK_TYPES)[number];
