import { Hono } from 'hono';
import { CollabService } from '../services/collab.service.js';
import type { Env } from '../env.js';
import type { AuthUser } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';

export const collabRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

collabRoutes.post('/sessions', requireAuth, async (c) => {
  const body = await c.req.json() as { fileId: string };
  const svc = new CollabService(c.env);
  const { session, wsUrl } = await svc.createSession(body.fileId, c.get('user').id);
  return c.json({ success: true, data: { ...session, wsUrl } }, 201);
});

collabRoutes.get('/sessions/:fileId', requireAuth, async (c) => {
  const svc = new CollabService(c.env);
  const sessions = await svc.getActiveSessions(c.req.param('fileId')!);
  return c.json({ success: true, data: sessions });
});

// Internal heartbeat endpoint (called by Durable Object alarm)
collabRoutes.post('/heartbeat/:sessionId', async (c) => {
  const body = await c.req.json() as { activeUsers: number };
  await c.env.DB.prepare(
    `UPDATE collaboration_sessions
     SET active_users = ?, last_heartbeat = datetime('now')
     WHERE id = ?`
  )
    .bind(body.activeUsers, c.req.param('sessionId'))
    .run();

  return c.json({ success: true });
});
