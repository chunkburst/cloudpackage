// Auth service: user registration, login, JWT, API keys

import * as jose from 'jose';
import type { UserRow, ApiKeyRow, JwtPayload } from '@cloudpackage/shared/types';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@cloudpackage/shared';
import { API_KEY_PREFIX, API_KEY_LENGTH, JWT_EXPIRY_SECONDS } from '@cloudpackage/shared';
import type { Env } from '../env.js';

export class AuthService {
  constructor(private env: Env) {}

  async register(dto: {
    username: string;
    email: string;
    password: string;
    display_name?: string;
  }): Promise<{ user: UserRow; token: string }> {
    const existing = await this.env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    )
      .bind(dto.username, dto.email)
      .first();

    if (existing) {
      throw new ConflictError('Username or email already exists');
    }

    const id = crypto.randomUUID();
    const passwordHash = await this.hashPassword(dto.password);

    await this.env.DB.prepare(
      `INSERT INTO users (id, username, email, password_hash, display_name)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(id, dto.username, dto.email, passwordHash, dto.display_name || null)
      .run();

    const user: UserRow = {
      id,
      username: dto.username,
      email: dto.email,
      password_hash: passwordHash,
      display_name: dto.display_name || null,
      avatar_url: null,
      role: 'user',
      storage_quota: 1073741824,
      used_storage: 0,
      is_active: 1,
      last_login_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const token = await this.issueJwt(user);
    return { user, token };
  }

  async login(dto: {
    username: string;
    password: string;
  }): Promise<{ user: UserRow; token: string }> {
    const user = await this.env.DB.prepare(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1'
    )
      .bind(dto.username, dto.username)
      .first<UserRow>();

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    const valid = await this.verifyPassword(dto.password, user.password_hash);
    if (!valid) {
      throw new AuthenticationError('Invalid credentials');
    }

    await this.env.DB.prepare(
      "UPDATE users SET last_login_at = datetime('now') WHERE id = ?"
    )
      .bind(user.id)
      .run();

    const token = await this.issueJwt(user);
    return { user, token };
  }

  async validateToken(token: string): Promise<JwtPayload> {
    const secret = new TextEncoder().encode(this.env.JWT_SECRET);
    try {
      const { payload } = await jose.jwtVerify<JwtPayload>(token, secret);
      return payload;
    } catch {
      throw new AuthenticationError('Invalid or expired token');
    }
  }

  async getUserById(userId: string): Promise<UserRow> {
    const user = await this.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<UserRow>();

    if (!user) throw new NotFoundError('User', userId);
    return user;
  }

  async createApiKey(
    userId: string,
    dto: { name: string; scopes?: string; expires_at?: string }
  ): Promise<{ key: ApiKeyRow; fullKey: string }> {
    const id = crypto.randomUUID();
    const fullKey = this.generateApiKey();

    const encoder = new TextEncoder();
    const keyData = encoder.encode(fullKey + this.env.API_KEY_ENCRYPTION_KEY);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const key: ApiKeyRow = {
      id,
      user_id: userId,
      name: dto.name,
      key_prefix: fullKey.slice(0, 8),
      key_hash: keyHash,
      scopes: dto.scopes || 'read',
      last_used_at: null,
      expires_at: dto.expires_at || null,
      created_at: new Date().toISOString(),
    };

    await this.env.DB.prepare(
      `INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash, scopes, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(key.id, key.user_id, key.name, key.key_prefix, key.key_hash, key.scopes, key.expires_at)
      .run();

    return { key, fullKey };
  }

  async listApiKeys(userId: string): Promise<ApiKeyRow[]> {
    const result = await this.env.DB.prepare(
      'SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
    )
      .bind(userId)
      .all<ApiKeyRow>();

    return result.results;
  }

  async revokeApiKey(keyId: string, userId: string): Promise<void> {
    const key = await this.env.DB.prepare(
      'SELECT * FROM api_keys WHERE id = ? AND user_id = ?'
    )
      .bind(keyId, userId)
      .first();

    if (!key) throw new NotFoundError('API key', keyId);

    await this.env.DB.prepare('DELETE FROM api_keys WHERE id = ?')
      .bind(keyId)
      .run();
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.getUserById(userId);
    const valid = await this.verifyPassword(oldPassword, user.password_hash);
    if (!valid) throw new ValidationError('Current password is incorrect');

    const newHash = await this.hashPassword(newPassword);
    await this.env.DB.prepare(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
    )
      .bind(newHash, userId)
      .run();
  }

  async refreshToken(userId: string): Promise<{ token: string }> {
    const user = await this.getUserById(userId);
    return { token: await this.issueJwt(user) };
  }

  // ==============================
  // Private helpers
  // ==============================

  private async issueJwt(user: UserRow): Promise<string> {
    const secret = new TextEncoder().encode(this.env.JWT_SECRET);
    const now = Math.floor(Date.now() / 1000);

    return new jose.SignJWT({
      sub: user.id,
      username: user.username,
      role: user.role,
    } satisfies Omit<JwtPayload, 'iat' | 'exp'>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(now + JWT_EXPIRY_SECONDS)
      .sign(secret);
  }

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

  private async verifyPassword(
    password: string,
    storedHash: string
  ): Promise<boolean> {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;

    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return hashHex === originalHash;
  }

  private generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = new Uint8Array(API_KEY_LENGTH);
    crypto.getRandomValues(randomBytes);
    let result = API_KEY_PREFIX;
    for (const byte of randomBytes) {
      result += chars[byte % chars.length];
    }
    return result;
  }
}
