-- ============================================================
-- CloudPackage D1 Database Schema
-- Migration: 0001_initial.sql
-- Description: Initial schema with all core tables, indexes, and FTS
-- ============================================================

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    display_name    TEXT,
    avatar_url      TEXT,
    role            TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user', 'viewer')),
    storage_quota   INTEGER NOT NULL DEFAULT 1073741824,
    used_storage    INTEGER NOT NULL DEFAULT 0,
    is_active       INTEGER NOT NULL DEFAULT 1,
    last_login_at   TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- TABLE: api_keys
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    key_prefix      TEXT NOT NULL,
    key_hash        TEXT NOT NULL,
    scopes          TEXT NOT NULL DEFAULT 'read',
    last_used_at    TEXT,
    expires_at      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- ============================================================
-- TABLE: storage_configs
-- ============================================================
CREATE TABLE IF NOT EXISTS storage_configs (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    driver          TEXT NOT NULL CHECK(driver IN ('s3', 'webdav', 'local')),
    is_default      INTEGER NOT NULL DEFAULT 0,
    is_active       INTEGER NOT NULL DEFAULT 1,
    config_json     TEXT NOT NULL,
    mount_point     TEXT NOT NULL DEFAULT '/',
    priority        INTEGER NOT NULL DEFAULT 0,
    created_by      TEXT REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE: files
-- ============================================================
CREATE TABLE IF NOT EXISTS files (
    id              TEXT PRIMARY KEY,
    parent_id       TEXT REFERENCES files(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    path            TEXT NOT NULL,
    storage_id      TEXT REFERENCES storage_configs(id),
    storage_key     TEXT,
    mime_type       TEXT,
    size            INTEGER NOT NULL DEFAULT 0,
    checksum        TEXT,
    is_directory    INTEGER NOT NULL DEFAULT 0,
    owner_id        TEXT NOT NULL REFERENCES users(id),
    visibility      TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private', 'shared', 'public')),
    metadata_json   TEXT,
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_files_parent ON files(parent_id);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
CREATE INDEX IF NOT EXISTS idx_files_owner ON files(owner_id);
CREATE INDEX IF NOT EXISTS idx_files_storage ON files(storage_id);
CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
CREATE INDEX IF NOT EXISTS idx_files_visibility ON files(visibility);
CREATE UNIQUE INDEX IF NOT EXISTS idx_files_path_unique ON files(path, owner_id);

-- ============================================================
-- FTS5 Virtual Table for Full-Text Search
-- ============================================================
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
    name,
    content='files',
    content_rowid='rowid'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS files_ai AFTER INSERT ON files BEGIN
    INSERT INTO files_fts(rowid, name) VALUES (new.rowid, new.name);
END;

CREATE TRIGGER IF NOT EXISTS files_ad AFTER DELETE ON files BEGIN
    INSERT INTO files_fts(files_fts, rowid, name) VALUES ('delete', old.rowid, old.name);
END;

CREATE TRIGGER IF NOT EXISTS files_au AFTER UPDATE ON files BEGIN
    INSERT INTO files_fts(files_fts, rowid, name) VALUES ('delete', old.rowid, old.name);
    INSERT INTO files_fts(rowid, name) VALUES (new.rowid, new.name);
END;

-- ============================================================
-- TABLE: share_links
-- ============================================================
CREATE TABLE IF NOT EXISTS share_links (
    id              TEXT PRIMARY KEY,
    file_id         TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    token           TEXT NOT NULL UNIQUE,
    password_hash   TEXT,
    access_type     TEXT NOT NULL DEFAULT 'view' CHECK(access_type IN ('view', 'edit', 'raw')),
    max_accesses    INTEGER,
    access_count    INTEGER NOT NULL DEFAULT 0,
    expires_at      TEXT,
    created_by      TEXT NOT NULL REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_file ON share_links(file_id);

-- ============================================================
-- TABLE: webdav_tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS webdav_tokens (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    token_hash      TEXT NOT NULL UNIQUE,
    token_prefix    TEXT NOT NULL,
    allowed_paths   TEXT,
    read_only       INTEGER NOT NULL DEFAULT 1,
    last_used_at    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webdav_tokens_user ON webdav_tokens(user_id);

-- ============================================================
-- TABLE: collaboration_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id              TEXT PRIMARY KEY,
    file_id         TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    current_content TEXT,
    version         INTEGER NOT NULL DEFAULT 0,
    active_users    INTEGER NOT NULL DEFAULT 0,
    last_heartbeat  TEXT NOT NULL DEFAULT (datetime('now')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_collab_sessions_file ON collaboration_sessions(file_id);

-- ============================================================
-- TABLE: task_schedule
-- ============================================================
CREATE TABLE IF NOT EXISTS task_schedule (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    task_type       TEXT NOT NULL CHECK(task_type IN ('cleanup', 'sync', 'reindex', 'healthcheck')),
    cron_expression TEXT NOT NULL,
    config_json     TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    last_run_at     TEXT,
    last_run_status TEXT CHECK(last_run_status IN ('success', 'failed', 'running')),
    next_run_at     TEXT,
    created_by      TEXT REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE: themes
-- ============================================================
CREATE TABLE IF NOT EXISTS themes (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    is_system       INTEGER NOT NULL DEFAULT 1,
    created_by      TEXT REFERENCES users(id),
    config_json     TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE: system_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
    key             TEXT PRIMARY KEY,
    value_json      TEXT NOT NULL,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE: audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id              TEXT PRIMARY KEY,
    user_id         TEXT REFERENCES users(id),
    action          TEXT NOT NULL,
    resource_type   TEXT,
    resource_id     TEXT,
    details_json    TEXT,
    ip_address      TEXT,
    user_agent      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
