// File service: file/directory CRUD, upload/download, search

import type { FileRow, PaginationParams } from '@cloudpackage/shared/types';
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from '@cloudpackage/shared';
import { StorageService } from './storage.service.js';
import type { Env } from '../env.js';
import { PAGINATION_DEFAULT_PAGE, PAGINATION_DEFAULT_PAGE_SIZE, PAGINATION_MAX_PAGE_SIZE } from '@cloudpackage/shared';

export class FileService {
  private storage: StorageService;

  constructor(private env: Env) {
    this.storage = new StorageService(env);
  }

  async init(): Promise<void> {
    await this.storage.init();
  }

  // ==============================
  // Listing
  // ==============================

  async listFiles(
    parentId: string | null,
    userId: string,
    opts: PaginationParams = {}
  ): Promise<{ files: FileRow[]; total: number }> {
    const page = opts.page || PAGINATION_DEFAULT_PAGE;
    const pageSize = Math.min(opts.pageSize || PAGINATION_DEFAULT_PAGE_SIZE, PAGINATION_MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    const params: (string | null)[] = [];

    if (parentId === null) {
      whereClause += ' AND parent_id IS NULL';
    } else {
      whereClause += ' AND parent_id = ?';
      params.push(parentId);
    }

    // Visibility filter: owner sees all, others see shared/public
    whereClause += ` AND (owner_id = ? OR visibility != 'private')`;
    params.push(userId);

    const countResult = await this.env.DB.prepare(
      `SELECT COUNT(*) as count FROM files ${whereClause}`
    )
      .bind(...params)
      .first<{ count: number }>();

    const total = countResult?.count || 0;

    const sortBy = opts.sortBy || 'name';
    const sortOrder = opts.sortOrder || 'asc';
    const safeSortColumns = ['name', 'size', 'created_at', 'updated_at'];
    const sortCol = safeSortColumns.includes(sortBy) ? sortBy : 'name';
    const sortDir = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const result = await this.env.DB.prepare(
      `SELECT * FROM files ${whereClause} ORDER BY is_directory DESC, ${sortCol} ${sortDir} LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, offset)
      .all<FileRow>();

    return { files: result.results, total };
  }

  async getFile(fileId: string, userId: string): Promise<FileRow> {
    const file = await this.env.DB.prepare('SELECT * FROM files WHERE id = ?')
      .bind(fileId)
      .first<FileRow>();

    if (!file) throw new NotFoundError('File', fileId);
    await this.checkAccess(file, userId, 'read');
    return file;
  }

  // ==============================
  // Create / Update
  // ==============================

  async createDirectory(
    parentId: string | null,
    name: string,
    userId: string
  ): Promise<FileRow> {
    // Validate parent exists if provided
    if (parentId) {
      const parent = await this.env.DB.prepare(
        'SELECT * FROM files WHERE id = ? AND is_directory = 1'
      )
        .bind(parentId)
        .first<FileRow>();
      if (!parent) throw new NotFoundError('Directory', parentId);
    }

    const parentPath = parentId ? (await this.getFile(parentId, userId)).path : '';
    const path = parentPath ? `${parentPath}/${name}` : `/${name}`;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.env.DB.prepare(
      `INSERT INTO files (id, parent_id, name, path, is_directory, owner_id, visibility)
       VALUES (?, ?, ?, ?, 1, ?, 'private')`
    )
      .bind(id, parentId, name, path, userId)
      .run();

    return {
      id,
      parent_id: parentId,
      name,
      path,
      storage_id: null,
      storage_key: null,
      mime_type: null,
      size: 0,
      checksum: null,
      is_directory: 1,
      owner_id: userId,
      visibility: 'private',
      metadata_json: null,
      version: 1,
      created_at: now,
      updated_at: now,
    };
  }

  async createFile(
    parentId: string | null,
    name: string,
    userId: string,
    storageId?: string
  ): Promise<FileRow> {
    if (parentId) {
      const parent = await this.env.DB.prepare(
        'SELECT * FROM files WHERE id = ? AND is_directory = 1'
      )
        .bind(parentId)
        .first<FileRow>();
      if (!parent) throw new NotFoundError('Directory', parentId);
    }

    const parentPath = parentId ? (await this.getFile(parentId, userId)).path : '';
    const path = parentPath ? `${parentPath}/${name}` : `/${name}`;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Use the specified storage or the default
    const resolvedStorageId = storageId || this.storage.getDefaultDriver().config.id;

    await this.env.DB.prepare(
      `INSERT INTO files (id, parent_id, name, path, storage_id, is_directory, owner_id, visibility)
       VALUES (?, ?, ?, ?, ?, 0, ?, 'private')`
    )
      .bind(id, parentId, name, path, resolvedStorageId, userId)
      .run();

    return {
      id,
      parent_id: parentId,
      name,
      path,
      storage_id: resolvedStorageId,
      storage_key: null,
      mime_type: null,
      size: 0,
      checksum: null,
      is_directory: 0,
      owner_id: userId,
      visibility: 'private',
      metadata_json: null,
      version: 1,
      created_at: now,
      updated_at: now,
    };
  }

  // ==============================
  // Upload
  // ==============================

  async getPresignedUploadUrl(
    fileId: string,
    userId: string,
    mimeType: string
  ): Promise<{ url: string; key: string }> {
    const file = await this.getFile(fileId, userId);
    await this.checkAccess(file, userId, 'write');

    const storageId = file.storage_id!;
    const key = file.path;
    const url = await this.storage.getPresignedUploadUrl(storageId, key, 3600);

    await this.env.DB.prepare(
      "UPDATE files SET mime_type = ?, updated_at = datetime('now') WHERE id = ?"
    )
      .bind(mimeType, fileId)
      .run();

    return { url, key };
  }

  async confirmUpload(
    fileId: string,
    userId: string,
    key: string,
    size: number,
    checksum?: string
  ): Promise<FileRow> {
    await this.getFile(fileId, userId);

    await this.env.DB.prepare(
      `UPDATE files SET storage_key = ?, size = ?, checksum = ?, version = version + 1, updated_at = datetime('now') WHERE id = ?`
    )
      .bind(key, size, checksum || null, fileId)
      .run();

    // Update user storage usage
    await this.env.DB.prepare(
      'UPDATE users SET used_storage = used_storage + ? WHERE id = ?'
    )
      .bind(size, userId)
      .run();

    return this.getFile(fileId, userId);
  }

  async initMultipartUpload(
    fileId: string,
    userId: string,
    mimeType: string
  ): Promise<{ uploadId: string; key: string }> {
    const file = await this.getFile(fileId, userId);
    await this.checkAccess(file, userId, 'write');

    const key = file.path;
    const uploadId = await this.storage.createMultipartUpload(file.storage_id!, key);

    await this.env.DB.prepare(
      "UPDATE files SET mime_type = ?, updated_at = datetime('now') WHERE id = ?"
    )
      .bind(mimeType, fileId)
      .run();

    return { uploadId, key };
  }

  async getPresignedPartUrl(
    fileId: string,
    userId: string,
    uploadId: string,
    partNumber: number
  ): Promise<string> {
    const file = await this.getFile(fileId, userId);
    return this.storage.getPresignedPartUrl(
      file.storage_id!,
      file.path,
      uploadId,
      partNumber
    );
  }

  async completeMultipartUpload(
    fileId: string,
    userId: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>,
    size: number
  ): Promise<FileRow> {
    const file = await this.getFile(fileId, userId);
    await this.storage.completeMultipartUpload(
      file.storage_id!,
      file.path,
      uploadId,
      parts
    );

    return this.confirmUpload(fileId, userId, file.path, size);
  }

  async abortMultipartUpload(
    fileId: string,
    userId: string,
    uploadId: string
  ): Promise<void> {
    const file = await this.getFile(fileId, userId);
    await this.storage.abortMultipartUpload(file.storage_id!, file.path, uploadId);
  }

  // ==============================
  // Download
  // ==============================

  async getDownloadStream(
    fileId: string,
    userId: string
  ): Promise<{ stream: ReadableStream<Uint8Array>; meta: { name: string; mimeType: string; size: number } }> {
    const file = await this.getFile(fileId, userId);
    await this.checkAccess(file, userId, 'read');

    if (!file.storage_id || !file.storage_key) {
      throw new ValidationError('File has no content');
    }

    const { body } = await this.storage.getObject(file.storage_id, file.storage_key!);

    return {
      stream: body,
      meta: {
        name: file.name,
        mimeType: file.mime_type || 'application/octet-stream',
        size: file.size,
      },
    };
  }

  async getPresignedDownloadUrl(
    fileId: string,
    userId: string
  ): Promise<string> {
    const file = await this.getFile(fileId, userId);
    await this.checkAccess(file, userId, 'read');

    if (!file.storage_id || !file.storage_key) {
      throw new ValidationError('File has no content');
    }

    return this.storage.getPresignedDownloadUrl(
      file.storage_id,
      file.storage_key!,
      3600
    );
  }

  // ==============================
  // Mutate
  // ==============================

  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.getFile(fileId, userId);
    await this.checkAccess(file, userId, 'write');

    // Delete storage object if exists
    if (file.storage_id && file.storage_key) {
      await this.storage.deleteObject(file.storage_id, file.storage_key).catch(() => {
        // Storage deletion failure shouldn't block metadata deletion
      });
    }

    await this.env.DB.prepare('DELETE FROM files WHERE id = ?').bind(fileId).run();

    // Update user storage usage
    if (file.size > 0) {
      await this.env.DB.prepare(
        'UPDATE users SET used_storage = MAX(0, used_storage - ?) WHERE id = ?'
      )
        .bind(file.size, userId)
        .run();
    }
  }

  async moveFile(
    fileId: string,
    newParentId: string | null,
    userId: string,
    newName?: string
  ): Promise<FileRow> {
    const file = await this.getFile(fileId, userId);
    await this.checkAccess(file, userId, 'write');

    if (newParentId) {
      const parent = await this.env.DB.prepare(
        'SELECT * FROM files WHERE id = ? AND is_directory = 1'
      )
        .bind(newParentId)
        .first<FileRow>();
      if (!parent) throw new NotFoundError('Directory', newParentId);
    }

    const name = newName || file.name;
    const parentPath = newParentId
      ? (await this.getFile(newParentId, userId)).path
      : '';
    const newPath = parentPath ? `${parentPath}/${name}` : `/${name}`;

    await this.env.DB.prepare(
      `UPDATE files SET parent_id = ?, name = ?, path = ?, updated_at = datetime('now') WHERE id = ?`
    )
      .bind(newParentId, name, newPath, fileId)
      .run();

    return this.getFile(fileId, userId);
  }

  async copyFile(
    fileId: string,
    targetParentId: string | null,
    userId: string
  ): Promise<FileRow> {
    const file = await this.getFile(fileId, userId);
    await this.checkAccess(file, userId, 'read');

    const copy = await this.createFile(
      targetParentId,
      file.name,
      userId,
      file.storage_id || undefined
    );

    if (file.storage_id && file.storage_key) {
      const newKey = copy.path;
      const { body } = await this.storage.getObject(file.storage_id, file.storage_key!);
      await this.storage.putObject(file.storage_id, newKey, body, {
        mimeType: file.mime_type || undefined,
      });

      await this.env.DB.prepare(
        `UPDATE files SET storage_key = ?, size = ?, mime_type = ?, checksum = ?, updated_at = datetime('now') WHERE id = ?`
      )
        .bind(newKey, file.size, file.mime_type, file.checksum, copy.id)
        .run();
    }

    return this.getFile(copy.id, userId);
  }

  async renameFile(
    fileId: string,
    newName: string,
    userId: string
  ): Promise<FileRow> {
    const file = await this.getFile(fileId, userId);
    return this.moveFile(fileId, file.parent_id, userId, newName);
  }

  async updateMetadata(
    fileId: string,
    metadata: Record<string, unknown>,
    userId: string
  ): Promise<FileRow> {
    await this.getFile(fileId, userId);
    await this.env.DB.prepare(
      "UPDATE files SET metadata_json = ?, updated_at = datetime('now') WHERE id = ?"
    )
      .bind(JSON.stringify(metadata), fileId)
      .run();

    return this.getFile(fileId, userId);
  }

  async updateFile(
    fileId: string,
    userId: string,
    updates: Partial<Pick<FileRow, 'name' | 'visibility' | 'metadata_json'>>
  ): Promise<FileRow> {
    const file = await this.getFile(fileId, userId);
    await this.checkAccess(file, userId, 'write');

    if (updates.name) {
      return this.renameFile(fileId, updates.name, userId);
    }

    if (updates.visibility || updates.metadata_json !== undefined) {
      await this.env.DB.prepare(
        `UPDATE files SET visibility = ?, metadata_json = ?, updated_at = datetime('now') WHERE id = ?`
      )
        .bind(
          updates.visibility || file.visibility,
          updates.metadata_json ?? file.metadata_json,
          fileId
        )
        .run();
    }

    return this.getFile(fileId, userId);
  }

  // ==============================
  // Search
  // ==============================

  async searchFiles(
    query: string,
    userId: string,
    opts: PaginationParams = {}
  ): Promise<{ files: FileRow[]; total: number }> {
    const page = opts.page || PAGINATION_DEFAULT_PAGE;
    const pageSize = Math.min(opts.pageSize || PAGINATION_DEFAULT_PAGE_SIZE, PAGINATION_MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    const result = await this.env.DB.prepare(
      `SELECT f.* FROM files f
       JOIN files_fts fts ON f.rowid = fts.rowid
       WHERE files_fts MATCH ?
         AND (f.owner_id = ? OR f.visibility != 'private')
       ORDER BY rank
       LIMIT ? OFFSET ?`
    )
      .bind(query, userId, pageSize, offset)
      .all<FileRow>();

    return { files: result.results, total: result.results.length };
  }

  async getStorage(): Promise<StorageService> {
    return this.storage;
  }

  // ==============================
  // Permission helpers
  // ==============================

  private async checkAccess(
    file: FileRow,
    userId: string,
    action: 'read' | 'write'
  ): Promise<void> {
    // Owner has full access
    if (file.owner_id === userId) return;

    // Admin has full access
    const user = await this.env.DB.prepare('SELECT role FROM users WHERE id = ?')
      .bind(userId)
      .first<{ role: string }>();
    if (user?.role === 'admin') return;

    // Public files are readable
    if (action === 'read' && file.visibility === 'public') return;

    // Shared files are readable
    if (action === 'read' && file.visibility === 'shared') return;

    throw new AuthorizationError('Access denied');
  }
}
