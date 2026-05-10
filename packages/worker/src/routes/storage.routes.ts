import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { StorageService } from '../services/storage.service.js';
import type { Env } from '../env.js';
import type { AuthUser } from '../middleware/auth.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createStorageConfigSchema, updateStorageConfigSchema } from '@cloudpackage/shared/validation';

export const storageRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

async function getStorageService(env: Env): Promise<StorageService> {
  const svc = new StorageService(env);
  await svc.init();
  return svc;
}

storageRoutes.use('*', requireAuth, requireRole('admin'));

storageRoutes.get('/', async (c) => {
  const svc = await getStorageService(c.env);
  const configs = await svc.listConfigs();
  return c.json({ success: true, data: configs });
});

storageRoutes.post('/', zValidator('json', createStorageConfigSchema), async (c) => {
  const body = c.req.valid('json');
  const svc = await getStorageService(c.env);
  const config = await svc.createConfig(
    body.name,
    body.driver,
    body.config_json,
    body.mount_point || '/',
    c.get('user').id,
    body.is_default
  );
  return c.json({ success: true, data: config }, 201);
});

storageRoutes.get('/:id', async (c) => {
  const svc = await getStorageService(c.env);
  const config = await svc.getConfig(c.req.param('id'));
  return c.json({ success: true, data: config });
});

storageRoutes.put('/:id', zValidator('json', updateStorageConfigSchema), async (c) => {
  const body = c.req.valid('json');
  const svc = await getStorageService(c.env);
  await svc.updateConfig(c.req.param('id'), {
    ...body,
    is_default: body.is_default !== undefined ? (body.is_default ? 1 : 0) : undefined,
    is_active: body.is_active !== undefined ? (body.is_active ? 1 : 0) : undefined,
  });
  return c.json({ success: true });
});

storageRoutes.delete('/:id', async (c) => {
  const svc = await getStorageService(c.env);
  await svc.deleteConfig(c.req.param('id'));
  return c.json({ success: true });
});

storageRoutes.post('/:id/test', async (c) => {
  const svc = await getStorageService(c.env);
  const ok = await svc.testConnection(c.req.param('id'));
  return c.json({ success: true, data: { connected: ok } });
});

storageRoutes.put('/:id/default', async (c) => {
  const svc = await getStorageService(c.env);
  await svc.setDefaultConfig(c.req.param('id'));
  return c.json({ success: true });
});
