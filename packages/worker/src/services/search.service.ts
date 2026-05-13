// Search service: full-text search via FTS5

import type { FileRow, PaginationParams } from '@cloudpackage/shared/types';
import { SEARCH_MAX_RESULTS } from '@cloudpackage/shared';
import { PAGINATION_DEFAULT_PAGE, PAGINATION_DEFAULT_PAGE_SIZE, PAGINATION_MAX_PAGE_SIZE } from '@cloudpackage/shared';
import type { Env } from '../env.js';

export class SearchService {
  constructor(private env: Env) {}

  async fullTextSearch(
    query: string,
    userId: string,
    opts: PaginationParams & { fileType?: string; isDirectory?: boolean } = {}
  ): Promise<{ files: FileRow[]; total: number }> {
    const page = opts.page || PAGINATION_DEFAULT_PAGE;
    const pageSize = Math.min(
      opts.pageSize || PAGINATION_DEFAULT_PAGE_SIZE,
      PAGINATION_MAX_PAGE_SIZE
    );
    const offset = (page - 1) * pageSize;

    // Sanitize FTS5 query: escape special characters and add prefix matching
    const sanitized = query.replace(/['"*()^]/g, '').trim();
    const ftsQuery = sanitized
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `"${term}"`)
      .join(' OR ');

    if (!ftsQuery) return { files: [], total: 0 };

    let whereClause = `WHERE files_fts MATCH ?
      AND (f.owner_id = ? OR f.visibility != 'private')`;
    const params: (string | number)[] = [ftsQuery, userId];

    if (opts.fileType) {
      whereClause += ' AND f.mime_type LIKE ?';
      params.push(`${opts.fileType}%`);
    }

    if (opts.isDirectory !== undefined) {
      whereClause += ' AND f.is_directory = ?';
      params.push(opts.isDirectory ? 1 : 0);
    }

    const sql = `SELECT f.* FROM files f
      JOIN files_fts ON f.rowid = files_fts.rowid
      ${whereClause}
      ORDER BY rank
      LIMIT ? OFFSET ?`;

    const result = await this.env.DB.prepare(sql)
      .bind(...params, pageSize, offset)
      .all<FileRow>();

    return { files: result.results, total: Math.min(result.results.length, SEARCH_MAX_RESULTS) };
  }

  async searchSuggestions(
    partial: string,
    userId: string,
    limit = 10
  ): Promise<string[]> {
    const sanitized = partial.replace(/['"*()^]/g, '').trim();
    if (!sanitized || sanitized.length < 2) return [];

    // Simple prefix search using LIKE on file names
    const result = await this.env.DB.prepare(
      `SELECT DISTINCT name FROM files
       WHERE (owner_id = ? OR visibility != 'private')
         AND name LIKE ?
       LIMIT ?`
    )
      .bind(userId, `%${sanitized}%`, limit)
      .all<{ name: string }>();

    return result.results.map((r) => r.name);
  }

  async reindexFile(fileId: string): Promise<void> {
    // Files are auto-indexed via FTS triggers on INSERT/UPDATE/DELETE.
    // This method is a no-op but exists for the API contract.
    const file = await this.env.DB.prepare(
      'SELECT rowid, name FROM files WHERE id = ?'
    )
      .bind(fileId)
      .first<{ rowid: number; name: string }>();

    if (!file) return;

    // Delete old entry and re-insert to force reindex
    await this.env.DB.prepare(
      "INSERT INTO files_fts(files_fts, rowid, name) VALUES ('delete', ?, ?)"
    )
      .bind(file.rowid, file.name)
      .run();

    await this.env.DB.prepare(
      'INSERT INTO files_fts(rowid, name) VALUES (?, ?)'
    )
      .bind(file.rowid, file.name)
      .run();
  }

  async rebuildIndex(): Promise<void> {
    await this.env.DB.prepare(
      "INSERT INTO files_fts(files_fts) VALUES ('rebuild')"
    ).run();
  }

  async searchByMetadata(
    key: string,
    value: string,
    userId: string
  ): Promise<FileRow[]> {
    // Search metadata_json for key-value pair
    const result = await this.env.DB.prepare(
      `SELECT * FROM files
       WHERE json_extract(metadata_json, ?) = ?
         AND (owner_id = ? OR visibility != 'private')
       LIMIT ?`
    )
      .bind(`$.${key}`, value, userId, SEARCH_MAX_RESULTS)
      .all<FileRow>();

    return result.results;
  }
}
