import { type Context, type Next } from 'hono';
import * as jose from 'jose';
import type { JwtPayload } from '@cloudpackage/shared/types';
import { AuthenticationError, AuthorizationError } from '@cloudpackage/shared';
import type { Env } from '../env.js';

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'user' | 'viewer';
  authMethod: 'jwt' | 'apikey';
}

export async function requireAuth(
  c: Context<{ Bindings: Env; Variables: { user: AuthUser } }>,
  next: Next
) {
  await authenticateRequest(c.env, c as unknown as Context, (user) => {
    c.set('user', user);
  });

  if (!c.get('user')) {
    throw new AuthenticationError('Missing credentials');
  }

  await next();
}

export function requireRole(...roles: string[]) {
  return async (
    c: Context<{ Variables: { user: AuthUser } }>,
    next: Next
  ) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      throw new AuthorizationError('Insufficient role');
    }
    await next();
  };
}

export async function optionalAuth(
  c: Context<{ Bindings: Env; Variables: { user?: AuthUser } }>,
  next: Next
) {
  try {
    await authenticateRequest(c.env, c as unknown as Context, (user) => {
      c.set('user', user);
    });
  } catch {
    // User remains unauthenticated
  }

  await next();
}

async function authenticateRequest(
  env: Env,
  c: Context,
  setUser: (user: AuthUser) => void
) {
  const authHeader = c.req.header('Authorization');
  const apiKey = c.req.header('X-Api-Key');

  if (authHeader?.startsWith('Bearer ')) {
    await authenticateJwt(env, authHeader.slice(7), setUser);
  } else if (apiKey) {
    await authenticateApiKey(env, apiKey, setUser);
  }
}

async function authenticateJwt(
  env: Env,
  token: string,
  setUser: (user: AuthUser) => void
) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const { payload } = await jose.jwtVerify<JwtPayload>(token, secret);

  setUser({
    id: payload.sub,
    username: payload.username,
    role: payload.role,
    authMethod: 'jwt',
  });
}

async function authenticateApiKey(
  env: Env,
  apiKey: string,
  setUser: (user: AuthUser) => void
) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiKey + env.API_KEY_ENCRYPTION_KEY);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const result = await env.DB.prepare(
    `SELECT u.id, u.username, u.role
     FROM api_keys k
     JOIN users u ON k.user_id = u.id
     WHERE k.key_hash = ? AND u.is_active = 1
       AND (k.expires_at IS NULL OR k.expires_at > datetime('now'))`
  )
    .bind(keyHash)
    .first<{ id: string; username: string; role: 'admin' | 'user' | 'viewer' }>();

  if (!result) {
    throw new AuthenticationError('Invalid API key');
  }

  await env.DB.prepare(
    `UPDATE api_keys SET last_used_at = datetime('now') WHERE key_hash = ?`
  )
    .bind(keyHash)
    .run();

  setUser({
    id: result.id,
    username: result.username,
    role: result.role,
    authMethod: 'apikey',
  });
}
