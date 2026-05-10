// Theme service

import type { ThemeRow } from '@cloudpackage/shared/types';
import { NotFoundError, AuthorizationError } from '@cloudpackage/shared';
import type { Env } from '../env.js';

export class ThemeService {
  constructor(private env: Env) {}

  async listThemes(): Promise<ThemeRow[]> {
    const result = await this.env.DB.prepare(
      'SELECT * FROM themes ORDER BY is_system DESC, name ASC'
    ).all<ThemeRow>();
    return result.results;
  }

  async getTheme(id: string): Promise<ThemeRow> {
    const theme = await this.env.DB.prepare('SELECT * FROM themes WHERE id = ?')
      .bind(id)
      .first<ThemeRow>();
    if (!theme) throw new NotFoundError('Theme', id);
    return theme;
  }

  async createTheme(
    name: string,
    configJson: string,
    userId: string
  ): Promise<ThemeRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.env.DB.prepare(
      `INSERT INTO themes (id, name, is_system, created_by, config_json)
       VALUES (?, ?, 0, ?, ?)`
    )
      .bind(id, name, userId, configJson)
      .run();

    return {
      id,
      name,
      is_system: 0,
      created_by: userId,
      config_json: configJson,
      created_at: now,
      updated_at: now,
    };
  }

  async updateTheme(
    id: string,
    name: string | undefined,
    configJson: string | undefined,
    userId: string
  ): Promise<ThemeRow> {
    const theme = await this.getTheme(id);
    if (theme.is_system === 1 && theme.created_by !== userId) {
      throw new AuthorizationError('Cannot modify system themes');
    }

    await this.env.DB.prepare(
      `UPDATE themes SET name = ?, config_json = ?, updated_at = datetime('now') WHERE id = ?`
    )
      .bind(name || theme.name, configJson || theme.config_json, id)
      .run();

    return this.getTheme(id);
  }

  async deleteTheme(id: string, userId: string): Promise<void> {
    const theme = await this.getTheme(id);
    if (theme.is_system === 1) {
      throw new AuthorizationError('Cannot delete system themes');
    }
    if (theme.created_by !== userId) {
      throw new AuthorizationError('Cannot delete another user\'s theme');
    }

    await this.env.DB.prepare('DELETE FROM themes WHERE id = ?').bind(id).run();
  }

  async getActiveTheme(userId?: string): Promise<ThemeRow> {
    // Check user preference first
    if (userId) {
      const prefResult = await this.env.DB.prepare(
        'SELECT value_json FROM system_settings WHERE key = ?'
      )
        .bind(`user.${userId}.theme_id`)
        .first<{ value_json: string }>();

      if (prefResult) {
        const themeId = JSON.parse(prefResult.value_json) as string;
        try {
          return await this.getTheme(themeId);
        } catch {
          // Fall through to default
        }
      }
    }

    // Fall back to system default
    const defaultResult = await this.env.DB.prepare(
      'SELECT value_json FROM system_settings WHERE key = ?'
    )
      .bind('theme.default')
      .first<{ value_json: string }>();

    if (defaultResult) {
      const themeId = JSON.parse(defaultResult.value_json) as string;
      try {
        return await this.getTheme(themeId);
      } catch {
        // Fall through
      }
    }

    // Last resort: first system theme
    const theme = await this.env.DB.prepare(
      'SELECT * FROM themes WHERE is_system = 1 LIMIT 1'
    ).first<ThemeRow>();

    if (!theme) throw new NotFoundError('Theme');
    return theme;
  }
}
