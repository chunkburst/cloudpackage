import { type Context, type Next } from 'hono';
import type { Env } from '../env.js';
import type { AuthUser } from './auth.js';

export function logger() {
  return async (c: Context<{ Bindings: Env; Variables: { user?: AuthUser } }>, next: Next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;
    const user = c.get('user');
    const userId = user?.id || 'anonymous';
    const ip =
      c.req.header('CF-Connecting-IP') ||
      c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
      '-';

    console.log(
      JSON.stringify({
        ip,
        user: userId,
        method,
        path,
        status,
        duration_ms: duration,
        user_agent: c.req.header('User-Agent')?.slice(0, 200),
      })
    );
  };
}
