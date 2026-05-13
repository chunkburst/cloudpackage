import { Hono } from 'hono';
import * as jose from 'jose';
import { CollabService } from '../services/collab.service.js';
import type { JwtPayload } from '@cloudpackage/shared/types';
import type { Env } from '../env.js';
import type { AuthUser } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';

export const collabRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

async function userFromToken(env: Env, token: string): Promise<AuthUser> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const { payload } = await jose.jwtVerify<JwtPayload>(token, secret);
  return {
    id: payload.sub,
    username: payload.username,
    role: payload.role,
    authMethod: 'jwt',
  };
}

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

collabRoutes.get('/ws/:fileId', async (c) => {
  if (c.req.header('Upgrade') !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  const token = c.req.query('token');
  if (!token) return new Response('Unauthorized', { status: 401 });

  const user = await userFromToken(c.env, token);
  const fileId = c.req.param('fileId');
  const svc = new CollabService(c.env);
  await svc.createSession(fileId, user.id);

  const id = c.env.COLLABORATION.idFromName(fileId);
  const stub = c.env.COLLABORATION.get(id);
  const url = new URL(c.req.url);
  url.searchParams.set('userId', user.id);
  url.searchParams.set('username', user.username);
  return stub.fetch(new Request(url.toString(), c.req.raw));
});

collabRoutes.get('/state/:fileId', requireAuth, async (c) => {
  const id = c.env.COLLABORATION.idFromName(c.req.param('fileId')!);
  const state = await c.env.COLLABORATION.get(id).fetch('https://collab.local/state');
  return c.json({ success: true, data: await state.json() });
});
