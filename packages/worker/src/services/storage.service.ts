// Storage service: driver registry + configuration management

import { S3StorageDriver } from '../drivers/storage/s3.js';
import { WebdavStorageDriver } from '../drivers/storage/webdav.js';
import { LocalStorageDriver } from '../drivers/storage/local.js';
import type { StorageDriver, ObjectMeta, ListOptions } from '../drivers/storage/base.js';
import type { StorageConfigRow } from '@cloudpackage/shared/types';
import { NotFoundError, StorageError } from '@cloudpackage/shared';
import type { Env } from '../env.js';

interface DriverEntry {
  driver: StorageDriver;
  config: StorageConfigRow;
}

export class StorageService {
  private drivers = new Map<string, DriverEntry>();
  private defaultId: string | null = null;

  constructor(private env: Env) {}

  async init(): Promise<void> {
    const configs = await this.env.DB.prepare(
      'SELECT * FROM storage_configs WHERE is_active = 1 ORDER BY priority ASC'
    ).all<StorageConfigRow>();

    for (const config of configs.results) {
      await this.registerDriver(config);
    }

    const defaultConfig = configs.results.find((c) => c.is_default === 1);
    if (defaultConfig) {
      this.defaultId = defaultConfig.id;
    } else if (configs.results.length > 0) {
      this.defaultId = configs.results[0].id;
    }
  }

  private async registerDriver(config: StorageConfigRow): Promise<void> {
    let driver: StorageDriver;

    switch (config.driver) {
      case 's3':
        driver = new S3StorageDriver();
        break;
      case 'webdav':
        driver = new WebdavStorageDriver();
        break;
      case 'local':
        driver = new LocalStorageDriver();
        break;
      default:
        throw new Error(`Unknown storage driver type: ${config.driver}`);
    }

    await driver.init(JSON.parse(config.config_json));
    this.drivers.set(config.id, { driver, config });
  }

  getDriver(storageId: string): DriverEntry {
    const entry = this.drivers.get(storageId);
    if (!entry) throw new NotFoundError('Storage driver', storageId);
    return entry;
  }

  getDefaultDriver(): DriverEntry {
    if (!this.defaultId) throw new StorageError('No default storage configured');
    return this.getDriver(this.defaultId);
  }

  // ==============================
  // Config management
  // ==============================

  async listConfigs(): Promise<StorageConfigRow[]> {
    const result = await this.env.DB.prepare(
      'SELECT * FROM storage_configs ORDER BY priority ASC'
    ).all<StorageConfigRow>();
    return result.results;
  }

  async getConfig(id: string): Promise<StorageConfigRow> {
    const config = await this.env.DB.prepare(
      'SELECT * FROM storage_configs WHERE id = ?'
    )
      .bind(id)
      .first<StorageConfigRow>();

    if (!config) throw new NotFoundError('Storage config', id);
    return config;
  }

  async createConfig(
    name: string,
    driver: string,
    configJson: string,
    mountPoint: string,
    userId: string,
    isDefault = false
  ): Promise<StorageConfigRow> {
    const id = crypto.randomUUID();

    const config: StorageConfigRow = {
      id,
      name,
      driver: driver as StorageConfigRow['driver'],
      is_default: isDefault ? 1 : 0,
      is_active: 1,
      config_json: configJson,
      mount_point: mountPoint,
      priority: this.drivers.size,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.env.DB.prepare(
      `INSERT INTO storage_configs (id, name, driver, is_default, is_active, config_json, mount_point, priority, created_by)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`
    )
      .bind(config.id, config.name, config.driver, config.is_default, config.config_json, config.mount_point, config.priority, config.created_by)
      .run();

    await this.registerDriver(config);
    return config;
  }

  async updateConfig(
    id: string,
    updates: Partial<Pick<StorageConfigRow, 'name' | 'config_json' | 'mount_point' | 'priority' | 'is_active' | 'is_default'>>
  ): Promise<void> {
    const existing = await this.getConfig(id);

    if (updates.is_default === 1) {
      await this.env.DB.prepare('UPDATE storage_configs SET is_default = 0').run();
      this.defaultId = id;
    }

    const newConfigJson = updates.config_json || existing.config_json;

    await this.env.DB.prepare(
      `UPDATE storage_configs
       SET name = ?, config_json = ?, mount_point = ?, priority = ?, is_active = ?, is_default = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(
        updates.name || existing.name,
        newConfigJson,
        updates.mount_point || existing.mount_point,
        updates.priority ?? existing.priority,
        updates.is_active ?? existing.is_active,
        updates.is_default ?? existing.is_default,
        id
      )
      .run();

    // Re-register driver with updated config
    if (updates.config_json) {
      const entry = this.drivers.get(id);
      if (entry) {
        await entry.driver.init(JSON.parse(newConfigJson));
        entry.config.config_json = newConfigJson;
      }
    }
  }

  async deleteConfig(id: string): Promise<void> {
    await this.getConfig(id);

    await this.env.DB.prepare('DELETE FROM storage_configs WHERE id = ?').bind(id).run();

    this.drivers.delete(id);
    if (this.defaultId === id) {
      const remaining = await this.listConfigs();
      this.defaultId = remaining.length > 0 ? remaining[0].id : null;
    }
  }

  async testConnection(id: string): Promise<boolean> {
    const entry = this.getDriver(id);
    try {
      // Try to list with a limit of 1 to verify connectivity
      await entry.driver.listObjects('', { maxKeys: 1 });
      return true;
    } catch {
      return false;
    }
  }

  async setDefaultConfig(id: string): Promise<void> {
    await this.getConfig(id);

    await this.env.DB.prepare('UPDATE storage_configs SET is_default = 0').run();
    await this.env.DB.prepare(
      'UPDATE storage_configs SET is_default = 1, updated_at = datetime(\'now\') WHERE id = ?'
    )
      .bind(id)
      .run();

    this.defaultId = id;
  }

  // ==============================
  // Convenience storage operations
  // ==============================

  async putObject(storageId: string, key: string, body: ReadableStream<Uint8Array> | ArrayBuffer, meta?: Partial<Pick<ObjectMeta, 'mimeType' | 'size'>>): Promise<string> {
    const { driver } = this.getDriver(storageId);
    return driver.putObject(key, body, meta);
  }

  async getObject(storageId: string, key: string): Promise<{ body: ReadableStream<Uint8Array>; meta: ObjectMeta }> {
    const { driver } = this.getDriver(storageId);
    return driver.getObject(key);
  }

  async headObject(storageId: string, key: string): Promise<ObjectMeta> {
    const { driver } = this.getDriver(storageId);
    return driver.headObject(key);
  }

  async deleteObject(storageId: string, key: string): Promise<void> {
    const { driver } = this.getDriver(storageId);
    return driver.deleteObject(key);
  }

  async listObjects(storageId: string, prefix: string, opts?: ListOptions): Promise<ObjectMeta[]> {
    const { driver } = this.getDriver(storageId);
    return driver.listObjects(prefix, opts);
  }

  async getPresignedUploadUrl(storageId: string, key: string, expiresIn: number): Promise<string> {
    const { driver } = this.getDriver(storageId);
    return driver.getPresignedUploadUrl(key, expiresIn);
  }

  async getPresignedDownloadUrl(storageId: string, key: string, expiresIn: number): Promise<string> {
    const { driver } = this.getDriver(storageId);
    return driver.getPresignedDownloadUrl(key, expiresIn);
  }

  async createMultipartUpload(storageId: string, key: string): Promise<string> {
    const { driver } = this.getDriver(storageId);
    return driver.createMultipartUpload(key);
  }

  async getPresignedPartUrl(storageId: string, key: string, uploadId: string, partNumber: number): Promise<string> {
    const { driver } = this.getDriver(storageId);
    return driver.getPresignedPartUrl(key, uploadId, partNumber);
  }

  async completeMultipartUpload(storageId: string, key: string, uploadId: string, parts: import('../drivers/storage/base.js').PartInfo[]): Promise<void> {
    const { driver } = this.getDriver(storageId);
    return driver.completeMultipartUpload(key, uploadId, parts);
  }

  async abortMultipartUpload(storageId: string, key: string, uploadId: string): Promise<void> {
    const { driver } = this.getDriver(storageId);
    return driver.abortMultipartUpload(key, uploadId);
  }

  async resolveStorageForPath(path: string): Promise<DriverEntry> {
    // Find the storage whose mount_point matches the longest prefix of this path
    let bestMatch: DriverEntry | null = null;
    let bestLength = -1;

    for (const entry of this.drivers.values()) {
      const mp = entry.config.mount_point;
      if ((path === mp || path.startsWith(mp + '/')) && mp.length > bestLength) {
        bestMatch = entry;
        bestLength = mp.length;
      }
    }

    return bestMatch || this.getDefaultDriver();
  }
}
