// Admin service: user management, system stats, audit log, settings

import type { UserRow, AuditLogRow, SystemSettingRow } from '@cloudpackage/shared/types';
import { NotFoundError } from '@cloudpackage/shared';
import type { Env } from '../env.js';
import { PAGINATION_DEFAULT_PAGE, PAGINATION_DEFAULT_PAGE_SIZE, PAGINATION_MAX_PAGE_SIZE } from '@cloudpackage/shared';

export class AdminService {
  constructor(private env: Env) {}

  // ==============================
  // User management
  // ==============================

  async listUsers(opts: {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: string;
  } = {}): Promise<{ users: UserRow[]; total: number }> {
    const page = opts.page || PAGINATION_DEFAULT_PAGE;
    const pageSize = Math.min(opts.pageSize || PAGINATION_DEFAULT_PAGE_SIZE, PAGINATION_MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    const params: string[] = [];

    if (opts.search) {
      whereClause += ' AND (username LIKE ? OR email LIKE ?)';
      params.push(`%${opts.search}%`, `%${opts.search}%`);
    }

    if (opts.role) {
      whereClause += ' AND role = ?';
      params.push(opts.role);
    }

    const countResult = await this.env.DB.prepare(
      `SELECT COUNT(*) as count FROM users ${whereClause}`
    )
      .bind(...params)
      .first<{ count: number }>();

    const result = await this.env.DB.prepare(
      `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, offset)
      .all<UserRow>();

    return { users: result.results, total: countResult?.count || 0 };
  }

  async getUser(userId: string): Promise<UserRow> {
    const user = await this.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<UserRow>();
    if (!user) throw new NotFoundError('User', userId);
    return user;
  }

  async createUser(dto: {
    username: string;
    email: string;
    password: string;
    display_name?: string;
    role?: 'admin' | 'user' | 'viewer';
    storage_quota?: number;
  }): Promise<UserRow> {
    const id = crypto.randomUUID();
    const passwordHash = await this.hashPassword(dto.password);

    await this.env.DB.prepare(
      `INSERT INTO users (id, username, email, password_hash, display_name, role, storage_quota)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        dto.username,
        dto.email,
        passwordHash,
        dto.display_name || null,
        dto.role || 'user',
        dto.storage_quota || 1073741824
      )
      .run();

    return this.getUser(id);
  }

  async updateUser(
    userId: string,
    dto: {
      email?: string;
      display_name?: string;
      role?: 'admin' | 'user' | 'viewer';
      storage_quota?: number;
      is_active?: boolean;
    }
  ): Promise<UserRow> {
    const user = await this.getUser(userId);

    await this.env.DB.prepare(
      `UPDATE users
       SET email = ?, display_name = ?, role = ?, storage_quota = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(
        dto.email || user.email,
        dto.display_name ?? user.display_name,
        dto.role || user.role,
        dto.storage_quota ?? user.storage_quota,
        dto.is_active !== undefined ? (dto.is_active ? 1 : 0) : user.is_active,
        userId
      )
      .run();

    return this.getUser(userId);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.getUser(userId);
    await this.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  }

  // ==============================
  // System stats
  // ==============================

  async getSystemStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalFiles: number;
    totalStorageUsed: number;
    activeSessions: number;
  }> {
    const [
      totalUsers,
      activeUsers,
      totalFiles,
      totalStorage,
      activeSessions,
    ] = await Promise.all([
      this.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
      this.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').first<{ count: number }>(),
      this.env.DB.prepare('SELECT COUNT(*) as count FROM files WHERE is_directory = 0').first<{ count: number }>(),
      this.env.DB.prepare('SELECT COALESCE(SUM(size), 0) as total FROM files').first<{ total: number }>(),
      this.env.DB.prepare('SELECT COUNT(*) as count FROM collaboration_sessions WHERE active_users > 0').first<{ count: number }>(),
    ]);

    return {
      totalUsers: totalUsers?.count || 0,
      activeUsers: activeUsers?.count || 0,
      totalFiles: totalFiles?.count || 0,
      totalStorageUsed: totalStorage?.total || 0,
      activeSessions: activeSessions?.count || 0,
    };
  }

  // ==============================
  // Audit log
  // ==============================

  async getAuditLog(opts: {
    page?: number;
    pageSize?: number;
    userId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<{ entries: AuditLogRow[]; total: number }> {
    const page = opts.page || PAGINATION_DEFAULT_PAGE;
    const pageSize = Math.min(opts.pageSize || PAGINATION_DEFAULT_PAGE_SIZE, PAGINATION_MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    const params: string[] = [];

    if (opts.userId) {
      whereClause += ' AND user_id = ?';
      params.push(opts.userId);
    }

    if (opts.action) {
      whereClause += ' AND action = ?';
      params.push(opts.action);
    }

    if (opts.dateFrom) {
      whereClause += ' AND created_at >= ?';
      params.push(opts.dateFrom);
    }

    if (opts.dateTo) {
      whereClause += ' AND created_at <= ?';
      params.push(opts.dateTo);
    }

    const countResult = await this.env.DB.prepare(
      `SELECT COUNT(*) as count FROM audit_log ${whereClause}`
    )
      .bind(...params)
      .first<{ count: number }>();

    const result = await this.env.DB.prepare(
      `SELECT * FROM audit_log ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, offset)
      .all<AuditLogRow>();

    return { entries: result.results, total: countResult?.count || 0 };
  }

  async logAction(
    userId: string | null,
    action: string,
    resourceType: string | null,
    resourceId: string | null,
    details: unknown = null,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const id = crypto.randomUUID();
    await this.env.DB.prepare(
      `INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details_json, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        userId,
        action,
        resourceType,
        resourceId,
        details ? JSON.stringify(details) : null,
        ip || null,
        userAgent || null
      )
      .run();
  }

  // ==============================
  // System settings
  // ==============================

  async getSystemSettings(): Promise<Record<string, unknown>> {
    const result = await this.env.DB.prepare('SELECT * FROM system_settings').all<SystemSettingRow>();

    const settings: Record<string, unknown> = {};
    for (const row of result.results) {
      settings[row.key] = JSON.parse(row.value_json);
    }
    return settings;
  }

  async updateSystemSetting(key: string, value: unknown): Promise<void> {
    const valueJson = JSON.stringify(value);

    await this.env.DB.prepare(
      `INSERT INTO system_settings (key, value_json, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`
    )
      .bind(key, valueJson)
      .run();
  }

  async getSystemSetting(key: string): Promise<unknown> {
    const result = await this.env.DB.prepare(
      'SELECT value_json FROM system_settings WHERE key = ?'
    )
      .bind(key)
      .first<{ value_json: string }>();

    return result ? JSON.parse(result.value_json) : null;
  }

  // ==============================
  // Private
  // ==============================

  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.randomUUID();
    const data = encoder.encode(password + salt);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `${salt}:${hashHex}`;
  }
}
