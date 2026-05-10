import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AdminService } from '../services/admin.service.js';
import type { Env } from '../env.js';
import type { AuthUser } from '../middleware/auth.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  updateSystemSettingSchema,
} from '@cloudpackage/shared/validation';

export const adminRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

adminRoutes.use('*', requireAuth, requireRole('admin'));

// Users
adminRoutes.get('/users', async (c) => {
  const svc = new AdminService(c.env);
  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') || '50', 10);
  const search = c.req.query('search') || undefined;

  const { users, total } = await svc.listUsers({ page, pageSize, search });
  return c.json({ success: true, data: users, meta: { total } });
});

adminRoutes.post('/users', zValidator('json', adminCreateUserSchema), async (c) => {
  const body = c.req.valid('json');
  const svc = new AdminService(c.env);
  const user = await svc.createUser(body);
  return c.json({ success: true, data: user }, 201);
});

adminRoutes.get('/users/:id', async (c) => {
  const svc = new AdminService(c.env);
  const user = await svc.getUser(c.req.param('id'));
  return c.json({ success: true, data: user });
});

adminRoutes.put('/users/:id', zValidator('json', adminUpdateUserSchema), async (c) => {
  const body = c.req.valid('json');
  const svc = new AdminService(c.env);
  const user = await svc.updateUser(c.req.param('id'), body);
  return c.json({ success: true, data: user });
});

adminRoutes.delete('/users/:id', async (c) => {
  const svc = new AdminService(c.env);
  await svc.deleteUser(c.req.param('id'));
  return c.json({ success: true });
});

// Stats
adminRoutes.get('/stats', async (c) => {
  const svc = new AdminService(c.env);
  const stats = await svc.getSystemStats();
  return c.json({ success: true, data: stats });
});

// Audit log
adminRoutes.get('/audit', async (c) => {
  const svc = new AdminService(c.env);
  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') || '50', 10);

  const { entries, total } = await svc.getAuditLog({ page, pageSize });
  return c.json({ success: true, data: entries, meta: { total } });
});

// Settings
adminRoutes.get('/settings', async (c) => {
  const svc = new AdminService(c.env);
  const settings = await svc.getSystemSettings();
  return c.json({ success: true, data: settings });
});

adminRoutes.put('/settings/:key', zValidator('json', updateSystemSettingSchema), async (c) => {
  const body = c.req.valid('json');
  const svc = new AdminService(c.env);
  await svc.updateSystemSetting(c.req.param('key'), JSON.parse(body.value_json));
  return c.json({ success: true });
});
