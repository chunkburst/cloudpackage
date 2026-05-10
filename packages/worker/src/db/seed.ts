// Development seed data for local D1

import type { D1Database } from '@cloudflare/workers-types';

const ADMIN_PASSWORD_HASH =
  '$2a$10$dummy_hash_replace_with_real_bcrypt_hash';
const ADMIN_USER_ID = '00000000-0000-4000-8000-000000000001';
const DEFAULT_THEME_ID = '00000000-0000-4000-8000-000000000010';

export async function seed(db: D1Database): Promise<void> {
  // Admin user (password: admin123 — change in production!)
  await db
    .prepare(
      `INSERT OR IGNORE INTO users (id, username, email, password_hash, display_name, role, storage_quota, is_active)
       VALUES (?, ?, ?, ?, ?, 'admin', 10737418240, 1)`
    )
    .bind(ADMIN_USER_ID, 'admin', 'admin@cloudpackage.local', ADMIN_PASSWORD_HASH, 'Administrator')
    .run();

  // Default theme
  await db
    .prepare(
      `INSERT OR IGNORE INTO themes (id, name, is_system, config_json)
       VALUES (?, 'Default Light', 1, ?)`
    )
    .bind(
      DEFAULT_THEME_ID,
      JSON.stringify({
        '--color-primary': '#3b82f6',
        '--color-primary-hover': '#2563eb',
        '--color-bg-primary': '#ffffff',
        '--color-bg-secondary': '#f9fafb',
        '--color-text-primary': '#111827',
        '--color-text-secondary': '#6b7280',
        '--color-border': '#e5e7eb',
        '--color-sidebar-bg': '#1e293b',
        '--color-sidebar-text': '#e2e8f0',
        '--radius-sm': '0.25rem',
        '--radius-md': '0.375rem',
        '--radius-lg': '0.5rem',
      })
    )
    .run();

  // System settings
  const defaultSettings: Array<[string, unknown]> = [
    ['site.name', 'CloudPackage'],
    ['site.description', 'Serverless file management system'],
    ['auth.allow_registration', true],
    ['auth.jwt_expiry_hours', 24],
    ['upload.max_file_size_mb', 5000],
    ['upload.chunk_size_mb', 50],
    ['upload.max_concurrent_chunks', 3],
    ['preview.max_file_size_mb', 100],
    ['webdav.cache_ttl_seconds', 300],
    ['search.max_results', 100],
    ['guest.access_enabled', false],
  ];

  const insertSetting = db.prepare(
    `INSERT OR IGNORE INTO system_settings (key, value_json) VALUES (?, ?)`
  );

  for (const [key, value] of defaultSettings) {
    await insertSetting.bind(key, JSON.stringify(value)).run();
  }
}
