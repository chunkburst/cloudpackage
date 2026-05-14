// Search service: full-text search via FTS5

import type { FileRow, PaginationParams } from '@cloudpackage/shared/types';
import { SEARCH_MAX_RESULTS } from '@cloudpackage/shared';
import { PAGINATION_DEFAULT_PAGE, PAGINATION_DEFAULT_PAGE_SIZE, PAGINATION_MAX_PAGE_SIZE } from '@cloudpackage/shared';
import type { Env } from '../env.js';

export type SearchHitSource = 'name' | 'content';
export type SearchResult = FileRow & { snippet?: string | null; hit_source: SearchHitSource };

const CONTENT_INDEX_MAX_BYTES = 1024 * 1024;
const CONTENT_SNIPPET_LENGTH = 220;

export class SearchService {
  constructor(private env: Env) {}

  async fullTextSearch(
    query: string,
    userId: string,
    opts: PaginationParams & { fileType?: string; isDirectory?: boolean } = {}
  ): Promise<{ files: SearchResult[]; total: number }> {
    const page = opts.page || PAGINATION_DEFAULT_PAGE;
    const pageSize = Math.min(
      opts.pageSize || PAGINATION_DEFAULT_PAGE_SIZE,
      PAGINATION_MAX_PAGE_SIZE
    );
    const offset = (page - 1) * pageSize;

    const ftsQuery = this.toFtsQuery(query);
    if (!ftsQuery) return { files: [], total: 0 };

    const params: (string | number)[] = [ftsQuery, userId];
    let nameFilters = '';
    let contentFilters = '';

    if (opts.fileType) {
      nameFilters += ' AND f.mime_type LIKE ?';
      contentFilters += ' AND f.mime_type LIKE ?';
      params.push(`${opts.fileType}%`);
    }

    if (opts.isDirectory !== undefined) {
      nameFilters += ' AND f.is_directory = ?';
      contentFilters += ' AND f.is_directory = ?';
      params.push(opts.isDirectory ? 1 : 0);
    }

    const contentParams = params.slice(2);
    const sql = `
      WITH ranked AS (
        SELECT f.*, NULL AS snippet, 'name' AS hit_source, rank AS score
        FROM files f
        JOIN files_fts ON f.rowid = files_fts.rowid
        WHERE files_fts MATCH ?
          AND (f.owner_id = ? OR f.visibility != 'private')
          ${nameFilters}

        UNION ALL

        SELECT f.*, snippet(file_content_fts, 6, '<mark>', '</mark>', '...', 24) AS snippet, 'content' AS hit_source, rank AS score
        FROM file_content_fts
        JOIN files f ON f.id = file_content_fts.file_id
        WHERE file_content_fts MATCH ?
          AND (f.owner_id = ? OR f.visibility != 'private')
          ${contentFilters}
      )
      SELECT * FROM ranked
      GROUP BY id
      ORDER BY MIN(score)
      LIMIT ? OFFSET ?`;

    const result = await this.env.DB.prepare(sql)
      .bind(...params, ftsQuery, userId, ...contentParams, pageSize, offset)
      .all<SearchResult>();

    return { files: result.results, total: Math.min(result.results.length, SEARCH_MAX_RESULTS) };
  }

  async searchSuggestions(
    partial: string,
    userId: string,
    limit = 10
  ): Promise<string[]> {
    const sanitized = this.sanitizeQuery(partial);
    if (!sanitized || sanitized.length < 2) return [];

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

  async indexFileContent(file: FileRow, content: string | null): Promise<void> {
    await this.removeFileFromContentIndex(file.id);

    if (!content || file.is_directory || !this.isTextMimeType(file.mime_type || '') || file.size > CONTENT_INDEX_MAX_BYTES) {
      return;
    }

    await this.env.DB.prepare(
      `INSERT INTO file_content_fts(file_id, owner_id, visibility, name, path, mime_type, content)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        file.id,
        file.owner_id,
        file.visibility,
        file.name,
        file.path,
        file.mime_type || 'text/plain',
        this.trimContent(content)
      )
      .run();
  }

  async removeFileFromContentIndex(fileId: string): Promise<void> {
    await this.env.DB.prepare('DELETE FROM file_content_fts WHERE file_id = ?')
      .bind(fileId)
      .run();
  }

  async syncFileMetadata(file: FileRow): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE file_content_fts SET owner_id = ?, visibility = ?, name = ?, path = ?, mime_type = ? WHERE file_id = ?`
    )
      .bind(file.owner_id, file.visibility, file.name, file.path, file.mime_type || 'text/plain', file.id)
      .run();
  }

  async reindexFile(fileId: string): Promise<void> {
    const file = await this.env.DB.prepare(
      'SELECT rowid, name FROM files WHERE id = ?'
    )
      .bind(fileId)
      .first<{ rowid: number; name: string }>();

    if (!file) return;

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

  private toFtsQuery(query: string): string {
    return this.sanitizeQuery(query)
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `"${term}"`)
      .join(' OR ');
  }

  private sanitizeQuery(query: string): string {
    return query.replace(/['"*()^]/g, '').trim();
  }

  private trimContent(content: string): string {
    return content.length > CONTENT_SNIPPET_LENGTH * 100
      ? content.slice(0, CONTENT_SNIPPET_LENGTH * 100)
      : content;
  }

  private isTextMimeType(mimeType: string): boolean {
    return (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/xml' ||
      mimeType.includes('javascript') ||
      mimeType.includes('typescript') ||
      mimeType.includes('yaml') ||
      mimeType.includes('markdown')
    );
  }
}
