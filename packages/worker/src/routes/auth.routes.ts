import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AuthService } from '../services/auth.service.js';
import type { Env } from '../env.js';
import type { AuthUser } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createUserSchema,
  loginSchema,
  changePasswordSchema,
  createApiKeySchema,
} from '@cloudpackage/shared/validation';

export const authRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

authRoutes.post('/register', zValidator('json', createUserSchema), async (c) => {
  const body = c.req.valid('json');
  const svc = new AuthService(c.env);
  const { user, token } = await svc.register(body);
  return c.json({ success: true, data: { user, token } }, 201);
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json');
  const svc = new AuthService(c.env);
  const { user, token } = await svc.login(body);
  return c.json({ success: true, data: { user, token } });
});

authRoutes.post('/refresh', requireAuth, async (c) => {
  const svc = new AuthService(c.env);
  const { token } = await svc.refreshToken(c.get('user').id);
  return c.json({ success: true, data: { token } });
});

authRoutes.get('/me', requireAuth, async (c) => {
  const svc = new AuthService(c.env);
  const user = await svc.getUserById(c.get('user').id);
  return c.json({ success: true, data: { user } });
});

authRoutes.put('/password', requireAuth, zValidator('json', changePasswordSchema), async (c) => {
  const body = c.req.valid('json');
  const svc = new AuthService(c.env);
  await svc.changePassword(c.get('user').id, body.old_password, body.new_password);
  return c.json({ success: true });
});

authRoutes.get('/api-keys', requireAuth, async (c) => {
  const svc = new AuthService(c.env);
  const keys = await svc.listApiKeys(c.get('user').id);
  return c.json({ success: true, data: keys });
});

authRoutes.post('/api-keys', requireAuth, zValidator('json', createApiKeySchema), async (c) => {
  const body = c.req.valid('json');
  const svc = new AuthService(c.env);
  const { key, fullKey } = await svc.createApiKey(c.get('user').id, body);
  return c.json({ success: true, data: { ...key, key: fullKey } }, 201);
});

authRoutes.delete('/api-keys/:keyId', requireAuth, async (c) => {
  const svc = new AuthService(c.env);
  await svc.revokeApiKey(c.req.param('keyId')!, c.get('user').id);
  return c.json({ success: true });
});
