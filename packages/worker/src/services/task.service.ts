// Task service: scheduled task CRUD and execution

import type { TaskScheduleRow } from '@cloudpackage/shared/types';
import { NotFoundError } from '@cloudpackage/shared';
import type { Env } from '../env.js';

export class TaskService {
  constructor(private env: Env) {}

  async createTask(
    name: string,
    taskType: string,
    cronExpression: string,
    configJson: string | null,
    userId: string
  ): Promise<TaskScheduleRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.env.DB.prepare(
      `INSERT INTO task_schedule (id, name, task_type, cron_expression, config_json, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(id, name, taskType, cronExpression, configJson, userId)
      .run();

    return {
      id,
      name,
      task_type: taskType as TaskScheduleRow['task_type'],
      cron_expression: cronExpression,
      config_json: configJson,
      is_active: 1,
      last_run_at: null,
      last_run_status: null,
      next_run_at: null,
      created_by: userId,
      created_at: now,
    };
  }

  async updateTask(
    id: string,
    updates: Partial<Pick<TaskScheduleRow, 'name' | 'cron_expression' | 'config_json' | 'is_active'>>
  ): Promise<TaskScheduleRow> {
    const task = await this.getTask(id);

    await this.env.DB.prepare(
      `UPDATE task_schedule SET name = ?, cron_expression = ?, config_json = ?, is_active = ? WHERE id = ?`
    )
      .bind(
        updates.name || task.name,
        updates.cron_expression || task.cron_expression,
        updates.config_json ?? task.config_json,
        updates.is_active ?? task.is_active,
        id
      )
      .run();

    return this.getTask(id);
  }

  async deleteTask(id: string): Promise<void> {
    await this.getTask(id);
    await this.env.DB.prepare('DELETE FROM task_schedule WHERE id = ?').bind(id).run();
  }

  async listTasks(): Promise<TaskScheduleRow[]> {
    const result = await this.env.DB.prepare(
      'SELECT * FROM task_schedule ORDER BY created_at DESC'
    ).all<TaskScheduleRow>();
    return result.results;
  }

  async getTask(id: string): Promise<TaskScheduleRow> {
    const task = await this.env.DB.prepare(
      'SELECT * FROM task_schedule WHERE id = ?'
    )
      .bind(id)
      .first<TaskScheduleRow>();
    if (!task) throw new NotFoundError('Task', id);
    return task;
  }

  async executeTask(id: string): Promise<{ status: 'success' | 'failed'; message: string }> {
    const task = await this.getTask(id);

    await this.env.DB.prepare(
      `UPDATE task_schedule SET last_run_status = 'running', last_run_at = datetime('now') WHERE id = ?`
    )
      .bind(id)
      .run();

    try {
      switch (task.task_type) {
        case 'cleanup':
          await this.runCleanup();
          break;
        case 'sync':
          await this.runSync(task.config_json ? JSON.parse(task.config_json) : {});
          break;
        case 'reindex':
          await this.runReindex();
          break;
        case 'healthcheck':
          await this.runHealthcheck();
          break;
      }

      await this.env.DB.prepare(
        `UPDATE task_schedule
         SET last_run_status = 'success', next_run_at = datetime('now', ?)
         WHERE id = ?`
      )
        .bind(this.nextRunModifier(task.cron_expression), id)
        .run();

      return { status: 'success', message: `Task '${task.name}' completed` };
    } catch (err) {
      await this.env.DB.prepare(
        `UPDATE task_schedule
         SET last_run_status = 'failed', next_run_at = datetime('now', ?)
         WHERE id = ?`
      )
        .bind(this.nextRunModifier(task.cron_expression), id)
        .run();

      return {
        status: 'failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async runPendingTasks(): Promise<Array<{ id: string; result: { status: string; message: string } }>> {
    const tasks = await this.env.DB.prepare(
      `SELECT * FROM task_schedule
       WHERE is_active = 1
         AND (next_run_at IS NULL OR next_run_at <= datetime('now'))`
    ).all<TaskScheduleRow>();

    const results: Array<{ id: string; result: { status: string; message: string } }> = [];

    for (const task of tasks.results) {
      const result = await this.executeTask(task.id);
      results.push({ id: task.id, result });
    }

    return results;
  }

  // ==============================
  // Task implementations
  // ==============================

  private nextRunModifier(cronExpression: string): string {
    const parts = cronExpression.trim().split(/\s+/);
    const minute = parts[0] || '';

    if (minute.startsWith('*/')) {
      const value = Number(minute.slice(2));
      if (Number.isInteger(value) && value > 0) return `+${value} minutes`;
    }

    if (minute === '*') return '+1 minutes';
    return '+1 hours';
  }

  private async runCleanup(): Promise<void> {
    await this.env.DB.prepare(
      "DELETE FROM share_links WHERE expires_at < datetime('now')"
    ).run();

    await this.env.DB.prepare(
      `DELETE FROM collaboration_sessions
       WHERE active_users = 0 AND last_heartbeat < datetime('now', '-1 hour')`
    ).run();
  }

  private async runSync(config: Record<string, unknown>): Promise<void> {
    // Storage sync: compare files between storage backends
    // This would be implemented when multi-storage support is needed
    console.log('Storage sync task running with config:', JSON.stringify(config));
  }

  private async runReindex(): Promise<void> {
    // Rebuild FTS index
    await this.env.DB.prepare("INSERT INTO files_fts(files_fts) VALUES ('rebuild')").run();
  }

  private async runHealthcheck(): Promise<void> {
    // Check database connectivity
    await this.env.DB.prepare('SELECT 1').first();

    // Check storage connectivity (would iterate through active configs)
  }
}
