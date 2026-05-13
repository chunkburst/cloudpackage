// CloudPackage Worker - Main entry point
import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { logger } from './middleware/logger.js';
import { requireAuth, optionalAuth } from './middleware/auth.js';
import type { Env } from './env.js';
import type { AuthUser } from './middleware/auth.js';

// Durable Objects — must be exported for wrangler deploy
export { CollaborationRoom } from './do/collaboration-room.js';
export { UploadSession } from './do/upload-session.js';

import { authRoutes } from './routes/auth.routes.js';
import { filesRoutes } from './routes/files.routes.js';
import { storageRoutes } from './routes/storage.routes.js';
import { shareRoutes } from './routes/share.routes.js';
import { webdavRoutes, webdavTokenRoutes } from './routes/webdav.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { searchRoutes } from './routes/search.routes.js';
import { collabRoutes } from './routes/collab.routes.js';
import { taskRoutes } from './routes/task.routes.js';
import { themeRoutes } from './routes/theme.routes.js';
import { previewRoutes } from './routes/preview.routes.js';
import { TaskService } from './services/task.service.js';

const app = new Hono<{ Bindings: Env; Variables: { user?: AuthUser } }>();

// Global middleware
app.use('*', (c, next) => {
  const origins = c.env.CORS_ORIGINS || '*';
  return corsMiddleware(origins)(c, next);
});
app.use('*', logger());
app.use('*', rateLimiter());

// Error handler
app.onError(errorHandler);

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});

// Public routes (no auth required)
app.route('/api/auth', authRoutes);
app.route('/api/share', shareRoutes);           // Public share access has own auth
app.route('/api/themes', themeRoutes);

// Optional auth (supports both authenticated and anonymous)
app.use('/api/search/*', optionalAuth);
app.route('/api/search', searchRoutes);

// Protected routes
app.route('/api/collab', collabRoutes);
app.use('/api/*', requireAuth);
app.route('/api/files', filesRoutes);
app.route('/api/storage', storageRoutes);
app.route('/api/webdav', webdavTokenRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/tasks', taskRoutes);
app.route('/api/preview', previewRoutes);

// WebDAV (has own authentication via webdav_tokens)
app.route('/webdav', webdavRoutes);

// 404 catch-all
app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404);
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await new TaskService(env).runPendingTasks();
  },
};
