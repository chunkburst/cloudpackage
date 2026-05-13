import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createWebdavTokenSchema } from '@cloudpackage/shared/validation';
import type { FileRow, WebdavTokenRow } from '@cloudpackage/shared/types';
import { FileService } from '../services/file.service.js';
import { WebdavService } from '../services/webdav.service.js';
import type { Env } from '../env.js';
import type { AuthUser } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';

export const webdavRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthUser } }>();
export const webdavTokenRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

type PublicWebdavToken = Omit<WebdavTokenRow, 'token_hash'>;

const WRITE_METHODS = new Set(['PUT', 'DELETE', 'MKCOL', 'MOVE', 'COPY']);

function normalizeWebdavPath(rawPath: string): string {
  const decoded = decodeURIComponent(rawPath || '/');
  const path = decoded.startsWith('/') ? decoded : `/${decoded}`;
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

function pathFromRequest(c: Context): string {
  return normalizeWebdavPath(`/${c.req.param('*') || ''}`);
}

function getWebdavToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    return token || null;
  }
  if (authHeader.startsWith('Basic ')) {
    const decoded = atob(authHeader.slice(6));
    const separatorIndex = decoded.indexOf(':');
    const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : decoded;
    return password || null;
  }
  return null;
}

function unauthorizedResponse(): Response {
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="WebDAV", Bearer realm="WebDAV"' },
  });
}

function ensureWritable(token: WebdavTokenRow): Response | null {
  return token.read_only === 1 ? new Response('Read-only token', { status: 403 }) : null;
}

function dirname(path: string): string {
  const index = path.lastIndexOf('/');
  return index <= 0 ? '/' : path.slice(0, index);
}

function basename(path: string): string {
  return path.split('/').filter(Boolean).pop() || '';
}

function destinationPath(destination: string | undefined, requestUrl: string): string | null {
  if (!destination) return null;
  const url = new URL(destination, requestUrl);
  const pathname = url.pathname.startsWith('/webdav')
    ? url.pathname.slice('/webdav'.length) || '/'
    : url.pathname;
  return normalizeWebdavPath(pathname);
}

async function findReadableFile(env: Env, path: string, userId: string): Promise<FileRow | null> {
  return env.DB.prepare(
    `SELECT * FROM files WHERE path = ? AND (owner_id = ? OR visibility != 'private')`
  )
    .bind(path, userId)
    .first<FileRow>();
}

async function findOwnedFile(env: Env, path: string, userId: string): Promise<FileRow | null> {
  return env.DB.prepare('SELECT * FROM files WHERE path = ? AND owner_id = ?')
    .bind(path, userId)
    .first<FileRow>();
}

async function findParentId(env: Env, path: string, userId: string): Promise<string | null | undefined> {
  const parentPath = dirname(path);
  if (parentPath === '/') return null;

  const parent = await env.DB.prepare(
    'SELECT id FROM files WHERE path = ? AND owner_id = ? AND is_directory = 1'
  )
    .bind(parentPath, userId)
    .first<{ id: string }>();

  return parent?.id;
}

async function createOrReplaceFile(
  env: Env,
  fileSvc: FileService,
  path: string,
  userId: string,
  body: ArrayBuffer,
  mimeType: string
): Promise<{ status: number }> {
  const existing = await findOwnedFile(env, path, userId);
  if (existing?.is_directory) return { status: 409 };

  let fileId = existing?.id;
  if (!fileId) {
    const parentId = await findParentId(env, path, userId);
    if (parentId === undefined) return { status: 409 };
    const file = await fileSvc.createFile(parentId, basename(path), userId);
    fileId = file.id;
  }

  await fileSvc.writeFileContent(fileId, userId, body, mimeType, body.byteLength);
  return { status: existing ? 204 : 201 };
}

function tokenToPublic(token: WebdavTokenRow): PublicWebdavToken {
  const { token_hash, ...publicToken } = token;
  return publicToken;
}

webdavTokenRoutes.get('/tokens', requireAuth, async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM webdav_tokens WHERE user_id = ? ORDER BY created_at DESC'
  )
    .bind(c.get('user').id)
    .all<WebdavTokenRow>();

  return c.json({ success: true, data: result.results.map(tokenToPublic) });
});

webdavTokenRoutes.post('/tokens', requireAuth, zValidator('json', createWebdavTokenSchema), async (c) => {
  const body = c.req.valid('json');
  const id = crypto.randomUUID();
  const rawToken = crypto.randomUUID().replace(/-/g, '');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawToken));
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  await c.env.DB.prepare(
    `INSERT INTO webdav_tokens (id, user_id, name, token_hash, token_prefix, allowed_paths, read_only)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      c.get('user').id,
      body.name,
      tokenHash,
      rawToken.slice(0, 8),
      body.allowed_paths || null,
      body.read_only ? 1 : 0
    )
    .run();

  return c.json({
    success: true,
    data: {
      id,
      name: body.name,
      token: rawToken,
      token_prefix: rawToken.slice(0, 8),
      allowed_paths: body.allowed_paths || null,
      read_only: body.read_only ? 1 : 0,
    },
  }, 201);
});

webdavTokenRoutes.delete('/tokens/:id', requireAuth, async (c) => {
  await c.env.DB.prepare(
    'DELETE FROM webdav_tokens WHERE id = ? AND user_id = ?'
  )
    .bind(c.req.param('id'), c.get('user').id)
    .run();

  return c.json({ success: true });
});

webdavRoutes.all('/*', async (c) => {
  const method = c.req.method;
  const path = pathFromRequest(c);
  const webdavSvc = new WebdavService(c.env);

  const token = getWebdavToken(c.req.header('Authorization'));
  if (!token) return unauthorizedResponse();

  const { user, token: webdavToken } = await webdavSvc.authenticate(token);
  webdavSvc.checkPathAccess(webdavToken, path);

  if (WRITE_METHODS.has(method)) {
    const readonlyResponse = ensureWritable(webdavToken);
    if (readonlyResponse) return readonlyResponse;
  }

  c.set('user', {
    id: user.id,
    username: user.username,
    role: user.role,
    authMethod: 'jwt',
  });

  const fileSvc = new FileService(c.env);
  await fileSvc.init();

  switch (method) {
    case 'OPTIONS':
      return new Response(null, {
        status: 204,
        headers: {
          Allow: 'OPTIONS, PROPFIND, GET, PUT, DELETE, MKCOL, MOVE, COPY, HEAD',
          DAV: '1, 2',
        },
      });

    case 'PROPFIND': {
      const depth = parseInt(c.req.header('Depth') || '1', 10);
      const xml = await webdavSvc.listDirectory(path, depth, user.id);
      return new Response(xml, {
        status: 207,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      });
    }

    case 'GET': {
      const file = await findReadableFile(c.env, path, user.id);
      if (!file) return new Response(null, { status: 404 });
      if (file.is_directory) {
        const xml = await webdavSvc.listDirectory(path, 1, user.id);
        return new Response(xml, {
          status: 207,
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        });
      }

      const { stream, meta } = await fileSvc.getDownloadStream(file.id, user.id);
      return new Response(stream, {
        headers: {
          'Content-Type': meta.mimeType,
          'Content-Length': String(meta.size),
          'Content-Disposition': `attachment; filename="${encodeURIComponent(meta.name)}"`,
        },
      });
    }

    case 'PUT': {
      const body = await c.req.raw.arrayBuffer();
      const mimeType = c.req.header('Content-Type') || 'application/octet-stream';
      const result = await createOrReplaceFile(c.env, fileSvc, path, user.id, body, mimeType);
      return new Response(null, { status: result.status });
    }

    case 'DELETE': {
      const file = await findOwnedFile(c.env, path, user.id);
      if (file) await fileSvc.deleteFile(file.id, user.id);
      return new Response(null, { status: 204 });
    }

    case 'MKCOL':
      await webdavSvc.createDirectory(path, user.id);
      return new Response(null, { status: 201 });

    case 'MOVE': {
      const destPath = destinationPath(c.req.header('Destination'), c.req.url);
      if (!destPath) return new Response('Missing Destination', { status: 400 });
      webdavSvc.checkPathAccess(webdavToken, destPath);

      const file = await findOwnedFile(c.env, path, user.id);
      if (!file) return new Response(null, { status: 404 });

      const parentId = await findParentId(c.env, destPath, user.id);
      if (parentId === undefined) return new Response('Destination parent not found', { status: 409 });

      await fileSvc.moveFile(file.id, parentId, user.id, basename(destPath));
      return new Response(null, { status: 201 });
    }

    case 'COPY': {
      const destPath = destinationPath(c.req.header('Destination'), c.req.url);
      if (!destPath) return new Response('Missing Destination', { status: 400 });
      webdavSvc.checkPathAccess(webdavToken, destPath);

      const file = await findReadableFile(c.env, path, user.id);
      if (!file) return new Response(null, { status: 404 });

      const parentId = await findParentId(c.env, destPath, user.id);
      if (parentId === undefined) return new Response('Destination parent not found', { status: 409 });

      const copy = await fileSvc.copyFile(file.id, parentId, user.id);
      if (copy.name !== basename(destPath)) {
        await fileSvc.moveFile(copy.id, parentId, user.id, basename(destPath));
      }
      return new Response(null, { status: 201 });
    }

    case 'HEAD': {
      const file = await findReadableFile(c.env, path, user.id);
      if (!file) return new Response(null, { status: 404 });

      return new Response(null, {
        status: 200,
        headers: {
          'Content-Length': String(file.size),
          'Content-Type': file.mime_type || 'application/octet-stream',
          'Last-Modified': new Date(file.updated_at).toUTCString(),
        },
      });
    }

    default:
      return new Response('Method Not Allowed', { status: 405 });
  }
});
