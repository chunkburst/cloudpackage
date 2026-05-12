import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { FileService } from '../services/file.service.js';
import type { Env } from '../env.js';
import type { AuthUser } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createFileSchema,
  updateFileSchema,
  moveFileSchema,
  copyFileSchema,
} from '@cloudpackage/shared/validation';

export const filesRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// Initialize FileService
async function getFileService(env: Env): Promise<FileService> {
  const svc = new FileService(env);
  await svc.init();
  return svc;
}

filesRoutes.get('/', requireAuth, async (c) => {
  const svc = await getFileService(c.env);
  const parentId = c.req.query('parentId') || c.req.query('parent_id') || null;
  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') || c.req.query('page_size') || '50', 10);
  const sortBy = c.req.query('sortBy') || c.req.query('sort') || 'name';
  const sortOrder = (c.req.query('sortOrder') || c.req.query('order') || 'asc') as 'asc' | 'desc';

  const result = await svc.listFiles(parentId, c.get('user').id, {
    page, pageSize, sortBy, sortOrder,
  });
  return c.json({ success: true, data: { files: result.files, total: result.total, page, pageSize } });
});

filesRoutes.post('/upload', requireAuth, async (c) => {
  const body = await c.req.parseBody();
  const upload = body.file;
  if (!(upload instanceof File)) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'file is required' } }, 400);
  }

  const parentIdValue = body.parent_id || body.parentId;
  const parentId = typeof parentIdValue === 'string' && parentIdValue ? parentIdValue : null;
  const svc = await getFileService(c.env);
  const file = await svc.uploadFile(parentId, upload, c.get('user').id);
  return c.json({ success: true, data: file }, 201);
});

filesRoutes.post('/', requireAuth, zValidator('json', createFileSchema), async (c) => {
  const body = c.req.valid('json');
  const svc = await getFileService(c.env);

  if (body.is_directory) {
    const file = await svc.createDirectory(body.parent_id ?? null, body.name, c.get('user').id);
    return c.json({ success: true, data: file }, 201);
  }

  const file = await svc.createFile(
    body.parent_id ?? null,
    body.name,
    c.get('user').id,
    body.storage_id
  );
  return c.json({ success: true, data: file }, 201);
});

filesRoutes.get('/:id', requireAuth, async (c) => {
  const svc = await getFileService(c.env);
  const file = await svc.getFileWithContent(c.req.param('id')!, c.get('user').id);
  return c.json({ success: true, data: file });
});

filesRoutes.put('/:id', requireAuth, zValidator('json', updateFileSchema), async (c) => {
  const body = c.req.valid('json');
  const svc = await getFileService(c.env);
  const file = await svc.updateFile(c.req.param('id')!, c.get('user').id, body);
  return c.json({ success: true, data: file });
});

filesRoutes.delete('/:id', requireAuth, async (c) => {
  const svc = await getFileService(c.env);
  await svc.deleteFile(c.req.param('id')!, c.get('user').id);
  return c.json({ success: true });
});

filesRoutes.post('/:id/move', requireAuth, zValidator('json', moveFileSchema), async (c) => {
  const body = c.req.valid('json');
  const svc = await getFileService(c.env);
  const file = await svc.moveFile(c.req.param('id')!, body.new_parent_id, c.get('user').id, body.new_name);
  return c.json({ success: true, data: file });
});

filesRoutes.post('/:id/copy', requireAuth, zValidator('json', copyFileSchema), async (c) => {
  const body = c.req.valid('json');
  const svc = await getFileService(c.env);
  const file = await svc.copyFile(c.req.param('id')!, body.target_parent_id, c.get('user').id);
  return c.json({ success: true, data: file }, 201);
});

// Upload
filesRoutes.post('/:id/upload/init', requireAuth, async (c) => {
  const svc = await getFileService(c.env);
  const { uploadId, key } = await svc.initMultipartUpload(
    c.req.param('id')!,
    c.get('user').id,
    c.req.header('Content-Type') || 'application/octet-stream'
  );
  return c.json({ success: true, data: { uploadId, key } });
});

filesRoutes.get('/:id/upload/status', requireAuth, async (c) => {
  return c.json({ success: true, data: { status: 'check DO' } });
});

filesRoutes.post('/:id/upload/complete', requireAuth, async (c) => {
  const body = await c.req.json() as { key: string; size: number; checksum?: string };
  const svc = await getFileService(c.env);
  const file = await svc.confirmUpload(c.req.param('id')!, c.get('user').id, body.key, body.size, body.checksum);
  return c.json({ success: true, data: file });
});

// Download
filesRoutes.get('/:id/download', requireAuth, async (c) => {
  const svc = await getFileService(c.env);
  const { stream, meta } = await svc.getDownloadStream(c.req.param('id')!, c.get('user').id);

  return new Response(stream, {
    headers: {
      'Content-Type': meta.mimeType,
      'Content-Length': String(meta.size),
      'Content-Disposition': `inline; filename="${encodeURIComponent(meta.name)}"`,
    },
  });
});

filesRoutes.get('/:id/download/url', requireAuth, async (c) => {
  const svc = await getFileService(c.env);
  const url = await svc.getPresignedDownloadUrl(c.req.param('id')!, c.get('user').id);
  return c.json({ success: true, data: { url } });
});
