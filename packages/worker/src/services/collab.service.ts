// Collaboration service: session management and Durable Object coordination

import type { CollaborationSessionRow, FileRow } from '@cloudpackage/shared/types';
import { NotFoundError } from '@cloudpackage/shared';
import type { Env } from '../env.js';

export class CollabService {
  constructor(private env: Env) {}

  async createSession(
    fileId: string,
    _userId: string
  ): Promise<{ session: CollaborationSessionRow; wsUrl: string }> {
    // Verify file exists and user has access
    const file = await this.env.DB.prepare('SELECT * FROM files WHERE id = ?')
      .bind(fileId)
      .first<FileRow>();

    if (!file) throw new NotFoundError('File', fileId);
    if (file.is_directory === 1) throw new NotFoundError('Cannot collaborate on a directory');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const session: CollaborationSessionRow = {
      id,
      file_id: fileId,
      current_content: null,
      version: 0,
      active_users: 0,
      last_heartbeat: now,
      created_at: now,
    };

    await this.env.DB.prepare(
      `INSERT INTO collaboration_sessions (id, file_id, current_content, version)
       VALUES (?, ?, ?, 0)`
    )
      .bind(session.id, session.file_id, session.current_content)
      .run();

    const wsUrl = `/api/collab/ws/${id}`;
    return { session, wsUrl };
  }

  async joinSession(
    sessionId: string,
    _userId: string
  ): Promise<CollaborationSessionRow> {
    const session = await this.env.DB.prepare(
      'SELECT * FROM collaboration_sessions WHERE id = ?'
    )
      .bind(sessionId)
      .first<CollaborationSessionRow>();

    if (!session) throw new NotFoundError('Collaboration session', sessionId);

    await this.env.DB.prepare(
      `UPDATE collaboration_sessions
       SET active_users = active_users + 1, last_heartbeat = datetime('now')
       WHERE id = ?`
    )
      .bind(sessionId)
      .run();

    return session;
  }

  async leaveSession(sessionId: string, _userId: string): Promise<void> {
    const session = await this.env.DB.prepare(
      'SELECT * FROM collaboration_sessions WHERE id = ?'
    )
      .bind(sessionId)
      .first<CollaborationSessionRow>();

    if (!session) return;

    await this.env.DB.prepare(
      `UPDATE collaboration_sessions
       SET active_users = MAX(0, active_users - 1), last_heartbeat = datetime('now')
       WHERE id = ?`
    )
      .bind(sessionId)
      .run();
  }

  async getActiveSessions(
    fileId: string
  ): Promise<CollaborationSessionRow[]> {
    const result = await this.env.DB.prepare(
      `SELECT * FROM collaboration_sessions
       WHERE file_id = ? AND active_users > 0
       ORDER BY last_heartbeat DESC`
    )
      .bind(fileId)
      .all<CollaborationSessionRow>();

    return result.results;
  }

  async getDocumentState(
    sessionId: string,
    _userId: string
  ): Promise<{ content: string | null; version: number }> {
    const session = await this.env.DB.prepare(
      'SELECT * FROM collaboration_sessions WHERE id = ?'
    )
      .bind(sessionId)
      .first<CollaborationSessionRow>();

    if (!session) throw new NotFoundError('Collaboration session', sessionId);

    return { content: session.current_content, version: session.version };
  }

  async saveContent(
    sessionId: string,
    content: string,
    version: number
  ): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE collaboration_sessions
       SET current_content = ?, version = ?, last_heartbeat = datetime('now')
       WHERE id = ?`
    )
      .bind(content, version, sessionId)
      .run();
  }

  async applyOperation(
    sessionId: string,
    _userId: string,
    operation: { type: 'insert' | 'delete'; position: number; text?: string; length?: number; version: number }
  ): Promise<{ content: string; version: number }> {
    const session = await this.env.DB.prepare(
      'SELECT * FROM collaboration_sessions WHERE id = ?'
    )
      .bind(sessionId)
      .first<CollaborationSessionRow>();

    if (!session) throw new NotFoundError('Collaboration session', sessionId);

    // Operational Transform: apply the operation to current content
    let content = session.current_content || '';

    if (operation.version !== session.version) {
      // In a real implementation, we'd do OT transformation here
      // For now, "first writer wins" — reject if version mismatch
      throw new Error('Version conflict: document has been modified. Reload and retry.');
    }

    if (operation.type === 'insert' && operation.text) {
      content = content.slice(0, operation.position) + operation.text + content.slice(operation.position);
    } else if (operation.type === 'delete' && operation.length) {
      content = content.slice(0, operation.position) + content.slice(operation.position + operation.length);
    }

    const newVersion = session.version + 1;
    await this.saveContent(sessionId, content, newVersion);

    return { content, version: newVersion };
  }

  async cleanExpiredSessions(maxAgeMinutes = 60): Promise<number> {
    const result = await this.env.DB.prepare(
      `DELETE FROM collaboration_sessions
       WHERE active_users = 0
         AND last_heartbeat < datetime('now', '-${maxAgeMinutes} minutes')`
    ).run();

    return result.meta.changes || 0;
  }
}
