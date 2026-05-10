import { Hono } from 'hono';
import { FileService } from '../services/file.service.js';
import { PreviewService } from '../services/preview.service.js';
import type { Env } from '../env.js';
import type { AuthUser } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';

export const previewRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

async function getFileService(env: Env): Promise<FileService> {
  const svc = new FileService(env);
  await svc.init();
  return svc;
}

previewRoutes.get('/config/:fileId', requireAuth, async (c) => {
  const svc = await getFileService(c.env);
  const file = await svc.getFile(c.req.param('fileId')!, c.get('user').id);

  const previewSvc = new PreviewService(c.env);
  const config = previewSvc.getPreviewConfig(file);

  return c.json({ success: true, data: config });
});
