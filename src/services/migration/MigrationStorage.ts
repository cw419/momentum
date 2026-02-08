/**
 * 迁移存储操作
 * 处理迁移信息的读写和旧数据获取
 */

import type { Chain } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import type { MigrationInfo } from './migrationTypes';
import { logger } from '../../utils/logger';
import { toError } from '../../utils/errorMessage';
import { localPreferences } from '../../utils/localPreferences';

/**
 * 迁移存储管理器
 * 负责迁移相关数据的存储操作
 */
export class MigrationStorage {
  private storage: MomentumStorage | null = null;

  /**
   * 设置存储实例
   */
  setStorage(storage: MomentumStorage | null): void {
    this.storage = storage;
    logger.debug('MIGRATION_STORAGE', 'Storage updated', {
      configured: !!storage,
      kind: storage?.kind,
    });
  }

  /**
   * 获取当前存储实例
   */
  getStorage(): MomentumStorage | null {
    return this.storage;
  }

  /**
   * 获取旧格式的链条数据
   */
  async getLegacyChains(): Promise<Chain[]> {
    try {
      const storage = this.storage;
      if (!storage) {
        logger.warn(
          'MIGRATION_STORAGE',
          'No storage configured; skipping legacy chain scan',
        );
        return [];
      }

      return await storage.getChains();
    } catch (error) {
      const err = toError(error);
      logger.error('MIGRATION_STORAGE', '获取旧链条数据失败', undefined, err);
      return [];
    }
  }

  /**
   * 获取迁移信息
   */
  getMigrationInfo(): MigrationInfo | null {
    try {
      const data = localPreferences.getExceptionRulesMigration();
      if (!data) return null;

      const parsed = JSON.parse(data);
      return {
        ...parsed,
        migratedAt: new Date(parsed.migratedAt),
      };
    } catch (error) {
      const err = toError(error);
      logger.error('MIGRATION_STORAGE', '获取迁移信息失败', undefined, err);
      return null;
    }
  }

  /**
   * 保存迁移信息
   */
  saveMigrationInfo(info: {
    version: string;
    migratedAt: Date;
    totalRules: number;
    skippedRules: number;
    errors: number;
    createdRuleIds: string[];
  }): void {
    try {
      localPreferences.setExceptionRulesMigration(JSON.stringify(info));
    } catch (error) {
      const err = toError(error);
      logger.error('MIGRATION_STORAGE', '保存迁移信息失败', undefined, err);
    }
  }

  /**
   * 清除迁移信息
   */
  clearMigrationInfo(): void {
    localPreferences.clearExceptionRulesMigration();
  }
}

/**
 * 迁移存储单例
 */
export const migrationStorage = new MigrationStorage();
