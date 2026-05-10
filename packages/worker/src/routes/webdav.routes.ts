import { Hono } from 'hono';
import { WebdavService } from '../services/webdav.service.js';
import { FileService } from '../services/file.service.js';
import type { Env } from '../env.js';
import type { AuthUser } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';

export const webdavRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthUser } }>();

// WebDAV protocol handler: maps HTTP methods to WebDAV operations
webdavRoutes.all('/*', async (c) => {
  const method = c.req.method;
  const path = '/' + (c.req.param('*') || '');
  const webdavSvc = new WebdavService(c.env);

  // Authenticate via Bearer token
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="WebDAV"' } });
  }

  const token = authHeader.slice(7);
  const { user, token: webdavToken } = await webdavSvc.authenticate(token);
  webdavSvc.checkPathAccess(webdavToken, path);

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
      const file = await fileSvc.getFile(
        (await fileSvc['env'].DB.prepare('SELECT id FROM files WHERE path = ? AND (owner_id = ? OR visibility != \'private\')')
          .bind(path, user.id)
          .first<{ id: string }>())?.id || '',
        user.id
      ).catch(async () => {
        // File not found or access denied
        const collectionXml = await webdavSvc.generateXmlResponse(path, c.req.header('Host') || '', user);
        return new Response(collectionXml, {
          status: 200,
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        });
      });

      if (file instanceof Response) return file;

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
      const name = path.split('/').pop() || '';

      // Create file record if doesn't exist
      let fileRecord = await c.env.DB.prepare(
        'SELECT id FROM files WHERE path = ? AND owner_id = ?'
      )
        .bind(path, user.id)
        .first<{ id: string }>();

      if (!fileRecord) {
        const file = await fileSvc.createFile(null, name, user.id);
        await fileSvc.moveFile(file.id, null, user.id, name);
        fileRecord = { id: file.id };
      }

      // Read the body and upload to storage
      const contentType = c.req.header('Content-Type') || 'application/octet-stream';
      if (c.req.raw.body) {
        await fileSvc.getPresignedUploadUrl(fileRecord.id, user.id, contentType);
        // For direct PUT via WebDAV, we'd stream to storage
        // Simplified: just create the file metadata
        await fileSvc.confirmUpload(fileRecord.id, user.id, path, parseInt(c.req.header('Content-Length') || '0'));
      }

      return new Response(null, { status: 201 });
    }

    case 'DELETE': {
      const fileRecord = await c.env.DB.prepare(
        'SELECT id FROM files WHERE path = ? AND owner_id = ?'
      )
        .bind(path, user.id)
        .first<{ id: string }>();

      if (fileRecord) {
        await fileSvc.deleteFile(fileRecord.id, user.id);
      }
      return new Response(null, { status: 204 });
    }

    case 'MKCOL':
      await webdavSvc.createDirectory(path, user.id);
      return new Response(null, { status: 201 });

    case 'MOVE': {
      const destination = c.req.header('Destination') || '';
      const destPath = new URL(destination).pathname;

      const fileRecord = await c.env.DB.prepare(
        'SELECT id FROM files WHERE path = ? AND owner_id = ?'
      )
        .bind(path, user.id)
        .first<{ id: string }>();

      if (fileRecord) {
        const newParentPath = destPath.substring(0, destPath.lastIndexOf('/')) || '/';
        const newParentRecord = await c.env.DB.prepare(
          'SELECT id FROM files WHERE path = ? AND is_directory = 1'
        )
          .bind(newParentPath)
          .first<{ id: string }>();

        const newName = destPath.split('/').pop();
        await fileSvc.moveFile(fileRecord.id, newParentRecord?.id || null, user.id, newName);
      }
      return new Response(null, { status: 201 });
    }

    case 'COPY': {
      const destination = c.req.header('Destination') || '';
      const destPath = new URL(destination).pathname;

      const fileRecord = await c.env.DB.prepare(
        'SELECT id FROM files WHERE path = ? AND (owner_id = ? OR visibility != \'private\')'
      )
        .bind(path, user.id)
        .first<{ id: string }>();

      if (fileRecord) {
        const newParentPath = destPath.substring(0, destPath.lastIndexOf('/')) || '/';
        const newParentRecord = await c.env.DB.prepare(
          'SELECT id FROM files WHERE path = ? AND is_directory = 1'
        )
          .bind(newParentPath)
          .first<{ id: string }>();

        await fileSvc.copyFile(fileRecord.id, newParentRecord?.id || null, user.id);
      }
      return new Response(null, { status: 201 });
    }

    case 'HEAD': {
      const fileRecord = await c.env.DB.prepare(
        'SELECT * FROM files WHERE path = ? AND (owner_id = ? OR visibility != \'private\')'
      )
        .bind(path, user.id)
        .first<{ id: string; size: number; mime_type: string; updated_at: string }>();

      if (!fileRecord) {
        return new Response(null, { status: 404 });
      }

      return new Response(null, {
        status: 200,
        headers: {
          'Content-Length': String(fileRecord.size),
          'Content-Type': fileRecord.mime_type || 'application/octet-stream',
          'Last-Modified': new Date(fileRecord.updated_at).toUTCString(),
        },
      });
    }

    default:
      return new Response('Method Not Allowed', { status: 405 });
  }
});

// Management API routes
webdavRoutes.get('/api/tokens', requireAuth, async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM webdav_tokens WHERE user_id = ?'
  )
    .bind(c.get('user').id)
    .all();

  return c.json({ success: true, data: result.results });
});

webdavRoutes.post('/api/tokens', requireAuth, async (c) => {
  const body = await c.req.json() as { name: string; allowed_paths?: string; read_only?: boolean };
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

  return c.json({ success: true, data: { id, name: body.name, token: rawToken } }, 201);
});

webdavRoutes.delete('/api/tokens/:id', requireAuth, async (c) => {
  await c.env.DB.prepare(
    'DELETE FROM webdav_tokens WHERE id = ? AND user_id = ?'
  )
    .bind(c.req.param('id'), c.get('user').id)
    .run();

  return c.json({ success: true });
});
