import { type Context, type Next } from 'hono';

export function corsMiddleware(originsStr: string) {
  const allowedOrigins = originsStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return async (c: Context, next: Next) => {
    const origin = c.req.header('Origin');

    if (origin && isAllowedOrigin(origin, allowedOrigins)) {
      c.res.headers.set('Access-Control-Allow-Origin', origin);
      c.res.headers.set('Access-Control-Allow-Credentials', 'true');
      c.res.headers.set('Access-Control-Max-Age', '86400');
    }

    if (c.req.method === 'OPTIONS') {
      c.res.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS, PROPFIND, MKCOL, MOVE, COPY, LOCK, UNLOCK'
      );
      c.res.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Api-Key, Depth, Destination, Overwrite, If-Match'
      );
      return new Response(null, { status: 204 });
    }

    await next();
  };
}

function isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
  return (
    allowedOrigins.includes('*') ||
    allowedOrigins.includes(origin) ||
    (origin.endsWith('.cloudpackage.pages.dev') && allowedOrigins.includes('https://*.cloudpackage.pages.dev'))
  );
}
