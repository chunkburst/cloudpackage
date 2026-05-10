// WebDAV service: XML generation, propfind parsing, protocol logic

import type { WebdavTokenRow, FileRow, UserRow } from '@cloudpackage/shared/types';
import { AuthenticationError, AuthorizationError, NotFoundError } from '@cloudpackage/shared';
import type { Env } from '../env.js';

export class WebdavService {
  constructor(private env: Env) {}

  async authenticate(token: string): Promise<{ user: UserRow; token: WebdavTokenRow }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const webdavToken = await this.env.DB.prepare(
      `SELECT * FROM webdav_tokens WHERE token_hash = ?`
    )
      .bind(tokenHash)
      .first<WebdavTokenRow>();

    if (!webdavToken) {
      throw new AuthenticationError('Invalid WebDAV token');
    }

    const user = await this.env.DB.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1')
      .bind(webdavToken.user_id)
      .first<UserRow>();

    if (!user) {
      throw new AuthenticationError('User not found or inactive');
    }

    await this.env.DB.prepare(
      "UPDATE webdav_tokens SET last_used_at = datetime('now') WHERE id = ?"
    )
      .bind(webdavToken.id)
      .run();

    return { user, token: webdavToken };
  }

  checkPathAccess(token: WebdavTokenRow, path: string): void {
    if (!token.allowed_paths) return; // null = all paths allowed

    const allowed = token.allowed_paths.split(',').map((p) => p.trim());
    const hasAccess = allowed.some((p) => path.startsWith(p));
    if (!hasAccess) {
      throw new AuthorizationError('Path not allowed by this token');
    }
  }

  async listDirectory(
    path: string,
    depth: number,
    userId: string
  ): Promise<string> {
    const normalizedPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;

    const files = await this.env.DB.prepare(
      `SELECT * FROM files WHERE path LIKE ? AND (owner_id = ? OR visibility != 'private') ORDER BY is_directory DESC, name ASC`
    )
      .bind(`${normalizedPath === '/' ? '' : normalizedPath}/%`, userId)
      .all<FileRow>();

    return this.buildPropfindResponse(normalizedPath, files.results, depth);
  }

  async getFileInfo(path: string, userId: string): Promise<string> {
    const file = await this.env.DB.prepare(
      `SELECT * FROM files WHERE path = ? AND (owner_id = ? OR visibility != 'private')`
    )
      .bind(path, userId)
      .first<FileRow>();

    if (!file) throw new NotFoundError('File', path);

    return this.buildPropfindResponse(path, [file], 0);
  }

  async createDirectory(path: string, userId: string): Promise<void> {
    const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
    const name = path.split('/').pop() || '';

    const id = crypto.randomUUID();
    await this.env.DB.prepare(
      `INSERT INTO files (id, parent_id, name, path, is_directory, owner_id)
       VALUES (?, (SELECT id FROM files WHERE path = ? AND is_directory = 1), ?, ?, 1, ?)`
    )
      .bind(id, parentPath, name, path, userId)
      .run();
  }

  async generateXmlResponse(
    path: string,
    _host: string,
    user: UserRow
  ): Promise<string> {
    // Basic WebDAV XML response for the root and directory listings
    return `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>${this.xmlEscape(path)}</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>${this.xmlEscape(user.display_name || user.username)}</D:displayname>
        <D:resourcetype><D:collection/></D:resourcetype>
        <D:getlastmodified>${new Date().toUTCString()}</D:getlastmodified>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;
  }

  private buildPropfindResponse(
    basePath: string,
    files: FileRow[],
    depth: number
  ): string {
    let responses = '';

    // Include the collection itself
    responses += this.buildResponseXml(basePath, null, true);

    for (const file of files) {
      if (depth === 0) {
        if (file.path === basePath) {
          responses += this.buildResponseXml(file.path, file, file.is_directory === 1);
        }
      } else if (depth === 1) {
        const parent = file.path.substring(0, file.path.lastIndexOf('/')) || '/';
        if (parent === basePath || (basePath === '/' && parent === '')) {
          responses += this.buildResponseXml(file.path, file, file.is_directory === 1);
        }
      } else {
        responses += this.buildResponseXml(file.path, file, file.is_directory === 1);
      }
    }

    return `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
${responses}
</D:multistatus>`;
  }

  private buildResponseXml(
    href: string,
    file: FileRow | null,
    isCollection: boolean
  ): string {
    const resourceType = isCollection
      ? '<D:collection/>'
      : '';

    const displayName = file?.name || href.split('/').pop() || '';

    return `  <D:response>
    <D:href>${this.xmlEscape(href)}</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>${this.xmlEscape(displayName)}</D:displayname>
        <D:resourcetype>${resourceType}</D:resourcetype>
        <D:getcontentlength>${file?.size || 0}</D:getcontentlength>
        <D:getcontenttype>${this.xmlEscape(file?.mime_type || (isCollection ? 'httpd/unix-directory' : 'application/octet-stream'))}</D:getcontenttype>
        <D:getlastmodified>${file ? new Date(file.updated_at).toUTCString() : new Date().toUTCString()}</D:getlastmodified>
        <D:getetag>${this.xmlEscape(file?.checksum || `"${file?.version || 1}"`)}</D:getetag>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`;
  }

  private xmlEscape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
