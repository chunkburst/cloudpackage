import { z } from 'zod/v4';

// ============================================================
// User schemas
// ============================================================

export const createUserSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  display_name: z.string().max(64).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  display_name: z.string().max(64).optional(),
  avatar_url: z.string().url().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  old_password: z.string(),
  new_password: z.string().min(8).max(128),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(64),
  scopes: z.string().optional(),
  expires_at: z.string().optional(),
});

// ============================================================
// File schemas
// ============================================================

export const createFileSchema = z.object({
  parent_id: z.string().nullable().optional(),
  name: z.string().min(1).max(255),
  mime_type: z.string().optional(),
  is_directory: z.boolean().optional(),
  storage_id: z.string().optional(),
});

export const updateFileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  visibility: z.enum(['private', 'shared', 'public']).optional(),
  metadata_json: z.string().optional(),
  content: z.string().optional(),
});

export const moveFileSchema = z.object({
  new_parent_id: z.string().nullable(),
  new_name: z.string().min(1).max(255).optional(),
});

export const copyFileSchema = z.object({
  target_parent_id: z.string().nullable(),
});

export const uploadInitSchema = z.object({
  size: z.number().int().positive(),
  mime_type: z.string(),
  name: z.string().min(1).max(255),
});

export const confirmUploadSchema = z.object({
  key: z.string(),
  size: z.number().int().nonnegative(),
  checksum: z.string().optional(),
});

// ============================================================
// Storage schemas
// ============================================================

export const createStorageConfigSchema = z.object({
  name: z.string().min(1).max(64),
  driver: z.enum(['s3', 'webdav', 'local', 'r2']),
  config_json: z.string(),
  mount_point: z.string().optional(),
  priority: z.number().int().optional(),
  is_default: z.boolean().optional(),
});

export const updateStorageConfigSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  config_json: z.string().optional(),
  mount_point: z.string().optional(),
  priority: z.number().int().optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
});

// ============================================================
// Share schemas
// ============================================================

export const createShareSchema = z.object({
  file_id: z.string(),
  access_type: z.enum(['view', 'edit', 'raw']).optional(),
  password: z.string().min(4).max(64).optional(),
  max_accesses: z.number().int().positive().optional(),
  expires_at: z.string().optional(),
});

export const updateShareSchema = z.object({
  access_type: z.enum(['view', 'edit', 'raw']).optional(),
  password: z.string().min(4).max(64).optional(),
  max_accesses: z.number().int().positive().optional(),
  expires_at: z.string().optional(),
});

export const accessShareSchema = z.object({
  password: z.string().optional(),
});

// ============================================================
// WebDAV schemas
// ============================================================

export const createWebdavTokenSchema = z.object({
  name: z.string().min(1).max(64),
  allowed_paths: z.string().optional(),
  read_only: z.boolean().optional(),
});

// ============================================================
// Admin schemas
// ============================================================

export const adminCreateUserSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  display_name: z.string().max(64).optional(),
  role: z.enum(['admin', 'user', 'viewer']).optional(),
  storage_quota: z.number().int().positive().optional(),
});

export const adminUpdateUserSchema = z.object({
  email: z.string().email().optional(),
  display_name: z.string().max(64).optional(),
  role: z.enum(['admin', 'user', 'viewer']).optional(),
  storage_quota: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});

export const createTaskSchema = z.object({
  name: z.string().min(1).max(64),
  task_type: z.enum(['cleanup', 'sync', 'reindex', 'healthcheck']),
  cron_expression: z.string(),
  config_json: z.string().optional(),
});

export const updateTaskSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  cron_expression: z.string().optional(),
  config_json: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const updateSystemSettingSchema = z.object({
  value_json: z.string(),
});

// ============================================================
// Search schema
// ============================================================

export const searchSchema = z.object({
  query: z.string().min(1).max(500),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(200).optional(),
  file_type: z.string().optional(),
});
