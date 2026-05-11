import { type Context, type Next } from 'hono';
import { RateLimitError } from '@cloudpackage/shared';
import type { Env } from '../env.js';
import type { AuthUser } from './auth.js';

interface RateWindow {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateWindow>();
let nextCleanupAt = 0;

export function rateLimiter() {
  return async (c: Context<{ Bindings: Env; Variables: { user?: AuthUser } }>, next: Next) => {
    const maxRequests = parseInt(c.env.RATE_LIMIT_MAX, 10) || 100;
    const key = getClientKey(c);
    const now = Date.now();
    cleanupExpiredWindows(now);
    const windowMs = 60000;

    let window = store.get(key);

    if (!window || window.resetAt < now) {
      window = { count: 0, resetAt: now + windowMs };
      store.set(key, window);
    }

    window.count++;

    c.res.headers.set('X-RateLimit-Limit', String(maxRequests));
    c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, maxRequests - window.count)));
    c.res.headers.set('X-RateLimit-Reset', String(Math.ceil(window.resetAt / 1000)));

    if (window.count > maxRequests) {
      throw new RateLimitError();
    }

    await next();
  };
}

function cleanupExpiredWindows(now: number): void {
  if (now < nextCleanupAt) return;

  for (const [key, window] of store) {
    if (window.resetAt < now) {
      store.delete(key);
    }
  }

  nextCleanupAt = now + 300000;
}

function getClientKey(c: Context<{ Bindings: Env; Variables: { user?: AuthUser } }>): string {
  const user = c.get('user');
  if (user?.id) return `user:${user.id}`;

  const ip =
    c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown';
  return `ip:${ip}`;
}
