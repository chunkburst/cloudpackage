import { Hono } from 'hono';
import { SearchService } from '../services/search.service.js';
import type { Env } from '../env.js';
import type { AuthUser } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';

export const searchRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

searchRoutes.get('/', requireAuth, async (c) => {
  const svc = new SearchService(c.env);
  const query = c.req.query('query') || c.req.query('q') || '';
  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') || c.req.query('page_size') || '50', 10);
  const fileType = c.req.query('fileType') || c.req.query('file_type') || c.req.query('mime_type') || undefined;
  const isDirectory = c.req.query('is_directory');

  const result = await svc.fullTextSearch(query, c.get('user').id, {
    page,
    pageSize,
    fileType,
    isDirectory: isDirectory === undefined ? undefined : isDirectory === 'true',
  });
  return c.json({ success: true, data: result.files, meta: { total: result.total } });
});

searchRoutes.get('/suggest', requireAuth, async (c) => {
  const svc = new SearchService(c.env);
  const partial = c.req.query('query') || c.req.query('q') || '';
  const suggestions = await svc.searchSuggestions(partial, c.get('user').id);
  return c.json({ success: true, data: suggestions });
});
