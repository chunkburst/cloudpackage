import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ShareService } from '../services/share.service.js';
import type { Env } from '../env.js';
import type { AuthUser } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { createShareSchema, updateShareSchema, accessShareSchema } from '@cloudpackage/shared/validation';

export const shareRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthUser } }>();

shareRoutes.get('/file/:fileId', requireAuth, async (c) => {
  const svc = new ShareService(c.env);
  const shares = await svc.listShares(c.req.param('fileId')!, c.get('user').id);
  return c.json({ success: true, data: shares });
});

shareRoutes.post('/', requireAuth, zValidator('json', createShareSchema), async (c) => {
  const body = c.req.valid('json');
  const svc = new ShareService(c.env);
  const share = await svc.createShareLink(body.file_id, c.get('user').id, body);
  return c.json({ success: true, data: share }, 201);
});

shareRoutes.get('/:token', async (c) => {
  const svc = new ShareService(c.env);
  const { file, shareLink } = await svc.accessShare(c.req.param('token'));
  return c.json({ success: true, data: { file, shareLink } });
});

shareRoutes.post('/:token/verify', zValidator('json', accessShareSchema), async (c) => {
  const body = c.req.valid('json');
  const svc = new ShareService(c.env);
  const { file, shareLink } = await svc.accessShare(c.req.param('token'), body.password);
  return c.json({ success: true, data: { file, shareLink } });
});

shareRoutes.put('/:token', requireAuth, zValidator('json', updateShareSchema), async (c) => {
  const body = c.req.valid('json');
  const svc = new ShareService(c.env);
  const share = await svc.updateShare(c.req.param('token')!, c.get('user').id, body);
  return c.json({ success: true, data: share });
});

shareRoutes.delete('/:token', requireAuth, async (c) => {
  const svc = new ShareService(c.env);
  await svc.revokeShare(c.req.param('token')!, c.get('user').id);
  return c.json({ success: true });
});
