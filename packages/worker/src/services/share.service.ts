// Share link service

import type { ShareLinkRow, FileRow } from '@cloudpackage/shared/types';
import { NotFoundError, AuthorizationError, ValidationError } from '@cloudpackage/shared';
import { SHARE_TOKEN_LENGTH } from '@cloudpackage/shared';
import type { Env } from '../env.js';
import { StorageService } from './storage.service.js';

type ShareAccessMode = 'view' | 'download' | 'raw' | 'edit';
export type PublicShareLink = Omit<ShareLinkRow, 'password_hash'> & { has_password: boolean };

export class ShareService {
  constructor(private env: Env) {}

  async createShareLink(
    fileId: string,
    userId: string,
    dto: {
      access_type?: 'view' | 'edit' | 'raw';
      password?: string;
      max_accesses?: number;
      expires_at?: string;
    }
  ): Promise<PublicShareLink> {
    // Verify file exists and user owns it
    const file = await this.env.DB.prepare('SELECT * FROM files WHERE id = ?')
      .bind(fileId)
      .first<FileRow>();

    if (!file) throw new NotFoundError('File', fileId);
    if (file.owner_id !== userId) throw new AuthorizationError('Only the owner can share');

    const id = crypto.randomUUID();
    const token = this.generateShareToken();
    let passwordHash: string | null = null;

    if (dto.password) {
      passwordHash = await this.hashPassword(dto.password);
    }

    const shareLink: ShareLinkRow = {
      id,
      file_id: fileId,
      token,
      password_hash: passwordHash,
      access_type: (dto.access_type as ShareLinkRow['access_type']) || 'view',
      max_accesses: dto.max_accesses || null,
      access_count: 0,
      expires_at: dto.expires_at || null,
      created_by: userId,
      created_at: new Date().toISOString(),
    };

    await this.env.DB.prepare(
      `INSERT INTO share_links (id, file_id, token, password_hash, access_type, max_accesses, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        shareLink.id,
        shareLink.file_id,
        shareLink.token,
        shareLink.password_hash,
        shareLink.access_type,
        shareLink.max_accesses,
        shareLink.expires_at,
        shareLink.created_by
      )
      .run();

    return this.toPublicShareLink(shareLink);
  }

  async accessShare(
    token: string,
    password?: string,
    mode: ShareAccessMode = 'view'
  ): Promise<{ file: FileRow; shareLink: PublicShareLink }> {
    const shareLink = await this.env.DB.prepare(
      'SELECT * FROM share_links WHERE token = ?'
    )
      .bind(token)
      .first<ShareLinkRow>();

    if (!shareLink) throw new NotFoundError('Share link');

    // Check expiry
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      throw new ValidationError('Share link has expired');
    }

    // Check access count
    if (
      shareLink.max_accesses &&
      shareLink.access_count >= shareLink.max_accesses
    ) {
      throw new ValidationError('Share link access limit reached');
    }

    // Check password
    if (shareLink.password_hash) {
      if (!password) {
        throw new AuthorizationError('Password required');
      }
      const valid = await this.verifyPassword(password, shareLink.password_hash);
      if (!valid) {
        throw new AuthorizationError('Invalid password');
      }
    }

    const file = await this.env.DB.prepare('SELECT * FROM files WHERE id = ?')
      .bind(shareLink.file_id)
      .first<FileRow>();

    if (!file) throw new NotFoundError('File', shareLink.file_id);

    this.ensureAccessType(shareLink, mode);

    // Increment access count
    await this.env.DB.prepare(
      'UPDATE share_links SET access_count = access_count + 1 WHERE id = ?'
    )
      .bind(shareLink.id)
      .run();

    return { file, shareLink: this.toPublicShareLink({ ...shareLink, access_count: shareLink.access_count + 1 }) };
  }

  async listShares(
    fileId: string,
    userId: string
  ): Promise<PublicShareLink[]> {
    const file = await this.env.DB.prepare('SELECT * FROM files WHERE id = ?')
      .bind(fileId)
      .first<FileRow>();

    if (!file) throw new NotFoundError('File', fileId);
    if (file.owner_id !== userId) throw new AuthorizationError();

    const result = await this.env.DB.prepare(
      'SELECT * FROM share_links WHERE file_id = ? ORDER BY created_at DESC'
    )
      .bind(fileId)
      .all<ShareLinkRow>();

    return result.results.map((shareLink) => this.toPublicShareLink(shareLink));
  }

  async revokeShare(token: string, userId: string): Promise<void> {
    const shareLink = await this.env.DB.prepare(
      'SELECT * FROM share_links WHERE token = ?'
    )
      .bind(token)
      .first<ShareLinkRow>();

    if (!shareLink) throw new NotFoundError('Share link');
    if (shareLink.created_by !== userId) throw new AuthorizationError();

    await this.env.DB.prepare('DELETE FROM share_links WHERE token = ?')
      .bind(token)
      .run();
  }

  async updateShare(
    token: string,
    userId: string,
    dto: {
      access_type?: 'view' | 'edit' | 'raw';
      password?: string;
      max_accesses?: number;
      expires_at?: string;
    }
  ): Promise<PublicShareLink> {
    const shareLink = await this.env.DB.prepare(
      'SELECT * FROM share_links WHERE token = ?'
    )
      .bind(token)
      .first<ShareLinkRow>();

    if (!shareLink) throw new NotFoundError('Share link');
    if (shareLink.created_by !== userId) throw new AuthorizationError();

    let passwordHash = shareLink.password_hash;
    if (dto.password !== undefined) {
      passwordHash = dto.password ? await this.hashPassword(dto.password) : null;
    }

    await this.env.DB.prepare(
      `UPDATE share_links SET access_type = ?, password_hash = ?, max_accesses = ?, expires_at = ? WHERE token = ?`
    )
      .bind(
        dto.access_type || shareLink.access_type,
        passwordHash,
        dto.max_accesses ?? shareLink.max_accesses,
        dto.expires_at ?? shareLink.expires_at,
        token
      )
      .run();

    const updated = await this.env.DB.prepare('SELECT * FROM share_links WHERE token = ?')
      .bind(token)
      .first<ShareLinkRow>();
    return this.toPublicShareLink(updated!);
  }

  async getSharedFileStream(
    token: string,
    password: string | undefined,
    mode: ShareAccessMode
  ): Promise<{ stream: ReadableStream<Uint8Array>; meta: { name: string; mimeType: string; size: number }; shareLink: PublicShareLink }> {
    const { file, shareLink } = await this.accessShare(token, password, mode);

    if (file.is_directory) {
      throw new ValidationError('Cannot download a directory');
    }
    if (!file.storage_id || !file.storage_key) {
      throw new ValidationError('File has no content');
    }

    const storage = new StorageService(this.env);
    await storage.init();
    const { body } = await storage.getObject(file.storage_id, file.storage_key);

    return {
      stream: body,
      meta: {
        name: file.name,
        mimeType: file.mime_type || 'application/octet-stream',
        size: file.size,
      },
      shareLink,
    };
  }

  // ==============================
  // Private
  // ==============================

  private ensureAccessType(shareLink: ShareLinkRow, mode: ShareAccessMode): void {
    if (mode === 'raw' && shareLink.access_type !== 'raw' && shareLink.access_type !== 'edit') {
      throw new AuthorizationError('Raw access is not allowed for this share link');
    }
    if (mode === 'edit' && shareLink.access_type !== 'edit') {
      throw new AuthorizationError('Edit access is not allowed for this share link');
    }
  }

  private toPublicShareLink(shareLink: ShareLinkRow): PublicShareLink {
    const { password_hash, ...publicShareLink } = shareLink;
    return { ...publicShareLink, has_password: !!password_hash };
  }

  private generateShareToken(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
    const bytes = new Uint8Array(SHARE_TOKEN_LENGTH);
    crypto.getRandomValues(bytes);
    let result = '';
    for (const byte of bytes) {
      result += chars[byte % chars.length];
    }
    return result;
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
}
