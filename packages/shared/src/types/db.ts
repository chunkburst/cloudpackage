// D1 database row types

export interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user' | 'viewer';
  storage_quota: number;
  used_storage: number;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  scopes: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface StorageConfigRow {
  id: string;
  name: string;
  driver: 's3' | 'webdav' | 'local' | 'r2';
  is_default: number;
  is_active: number;
  config_json: string;
  mount_point: string;
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileRow {
  id: string;
  parent_id: string | null;
  name: string;
  path: string;
  storage_id: string | null;
  storage_key: string | null;
  mime_type: string | null;
  size: number;
  checksum: string | null;
  is_directory: number;
  owner_id: string;
  visibility: 'private' | 'shared' | 'public';
  metadata_json: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ShareLinkRow {
  id: string;
  file_id: string;
  token: string;
  password_hash: string | null;
  access_type: 'view' | 'edit' | 'raw';
  max_accesses: number | null;
  access_count: number;
  expires_at: string | null;
  created_by: string;
  created_at: string;
}

export interface WebdavTokenRow {
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  token_prefix: string;
  allowed_paths: string | null;
  read_only: number;
  last_used_at: string | null;
  created_at: string;
}

export interface CollaborationSessionRow {
  id: string;
  file_id: string;
  current_content: string | null;
  version: number;
  active_users: number;
  last_heartbeat: string;
  created_at: string;
}

export interface TaskScheduleRow {
  id: string;
  name: string;
  task_type: 'cleanup' | 'sync' | 'reindex' | 'healthcheck';
  cron_expression: string;
  config_json: string | null;
  is_active: number;
  last_run_at: string | null;
  last_run_status: 'success' | 'failed' | 'running' | null;
  next_run_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ThemeRow {
  id: string;
  name: string;
  is_system: number;
  created_by: string | null;
  config_json: string;
  created_at: string;
  updated_at: string;
}

export interface SystemSettingRow {
  key: string;
  value_json: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details_json: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
