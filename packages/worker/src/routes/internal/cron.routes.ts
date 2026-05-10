import { Hono } from 'hono';
import { TaskService } from '../../services/task.service.js';
import type { Env } from '../../env.js';

export const cronRoutes = new Hono<{ Bindings: Env }>();

// Scheduled task handler — invoked by Cloudflare Workers cron trigger
cronRoutes.get('/cron', async (c) => {
  const svc = new TaskService(c.env);
  const results = await svc.runPendingTasks();

  return c.json({
    success: true,
    data: {
      tasksRun: results.length,
      results,
    },
  });
});
