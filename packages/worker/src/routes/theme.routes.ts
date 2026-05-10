import { Hono } from 'hono';
import { ThemeService } from '../services/theme.service.js';
import type { Env } from '../env.js';
import type { AuthUser } from '../middleware/auth.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const themeRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthUser } }>();

themeRoutes.get('/', async (c) => {
  const svc = new ThemeService(c.env);
  const themes = await svc.listThemes();
  return c.json({ success: true, data: themes });
});

themeRoutes.get('/:id', async (c) => {
  const svc = new ThemeService(c.env);
  const theme = await svc.getTheme(c.req.param('id'));
  return c.json({ success: true, data: theme });
});

themeRoutes.post('/', requireAuth, requireRole('admin'), async (c) => {
  const body = await c.req.json() as { name: string; config_json: string };
  const svc = new ThemeService(c.env);
  const theme = await svc.createTheme(body.name, body.config_json, c.get('user').id);
  return c.json({ success: true, data: theme }, 201);
});

themeRoutes.put('/:id', requireAuth, requireRole('admin'), async (c) => {
  const body = await c.req.json() as { name?: string; config_json?: string };
  const svc = new ThemeService(c.env);
  const theme = await svc.updateTheme(c.req.param('id')!, body.name, body.config_json, c.get('user').id);
  return c.json({ success: true, data: theme });
});

themeRoutes.delete('/:id', requireAuth, requireRole('admin'), async (c) => {
  const svc = new ThemeService(c.env);
  await svc.deleteTheme(c.req.param('id')!, c.get('user').id);
  return c.json({ success: true });
});
