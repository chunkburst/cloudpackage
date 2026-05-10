import { Hono } from 'hono';
import { TaskService } from '../services/task.service.js';
import type { Env } from '../env.js';
import type { AuthUser } from '../middleware/auth.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const taskRoutes = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

taskRoutes.use('*', requireAuth, requireRole('admin'));

taskRoutes.get('/', async (c) => {
  const svc = new TaskService(c.env);
  const tasks = await svc.listTasks();
  return c.json({ success: true, data: tasks });
});

taskRoutes.post('/', async (c) => {
  const body = await c.req.json() as { name: string; task_type: string; cron_expression: string; config_json?: string };
  const svc = new TaskService(c.env);
  const task = await svc.createTask(
    body.name,
    body.task_type,
    body.cron_expression,
    body.config_json || null,
    c.get('user').id
  );
  return c.json({ success: true, data: task }, 201);
});

taskRoutes.put('/:id', async (c) => {
  const body = await c.req.json() as { name?: string; cron_expression?: string; config_json?: string; is_active?: boolean };
  const svc = new TaskService(c.env);
  const task = await svc.updateTask(c.req.param('id'), {
    ...body,
    is_active: body.is_active !== undefined ? (body.is_active ? 1 : 0) : undefined,
  });
  return c.json({ success: true, data: task });
});

taskRoutes.delete('/:id', async (c) => {
  const svc = new TaskService(c.env);
  await svc.deleteTask(c.req.param('id'));
  return c.json({ success: true });
});

taskRoutes.post('/:id/run', async (c) => {
  const svc = new TaskService(c.env);
  const result = await svc.executeTask(c.req.param('id'));
  return c.json({ success: true, data: result });
});
