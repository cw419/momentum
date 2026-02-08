import { DeletedChain } from '../types';
import type { MomentumStorage } from '../storage/MomentumStorage';
import { logger } from '../utils/logger';
import { toError, getErrorMessage } from '../utils/errorMessage';

export class RecycleBinService {
  private static storage: MomentumStorage | null = null;

  static setStorage(storage: MomentumStorage | null): void {
    this.storage = storage;
  }

  /**
   * 获取当前使用的存储实例
   */
  private static getStorage(): MomentumStorage {
    if (!this.storage) {
      throw new Error('RecycleBinService storage is not configured');
    }
    return this.storage;
  }

  /**
   * 获取所有已删除的链条
   */
  static async getDeletedChains(): Promise<DeletedChain[]> {
    try {
      logger.debug('RECYCLE_BIN', '开始获取已删除链条');
      const storage = this.getStorage();
      const deletedChains = await storage.getDeletedChains();
      logger.debug('RECYCLE_BIN', '获取到已删除链条', {
        count: deletedChains.length,
        chains: deletedChains.map((c) => ({
          id: c.id,
          name: c.name,
          deletedAt: c.deletedAt,
        })),
      });
      return deletedChains;
    } catch (error) {
      logger.error(
        'RECYCLE_BIN',
        '获取已删除链条失败',
        undefined,
        toError(error),
      );
      throw new Error('获取已删除链条失败');
    }
  }

  /**
   * 将链条移动到回收箱（软删除）
   */
  static async moveToRecycleBin(chainId: string): Promise<void> {
    try {
      logger.info('RECYCLE_BIN', '将链条移动到回收箱', { chainId });
      const storage = this.getStorage();
      await storage.softDeleteChain(chainId);
      logger.info('RECYCLE_BIN', '链条已成功移动到回收箱', { chainId });
    } catch (error) {
      logger.error(
        'RECYCLE_BIN',
        '移动链条到回收箱失败',
        { chainId },
        toError(error),
      );
      throw new Error(`移动链条到回收箱失败: ${getErrorMessage(error)}`);
    }
  }

  /**
   * 从回收箱恢复链条
   */
  static async restoreChain(chainId: string): Promise<void> {
    try {
      logger.info('RECYCLE_BIN', '恢复链条', { chainId });
      const storage = this.getStorage();
      await storage.restoreChain(chainId);
      logger.info('RECYCLE_BIN', '链条已成功恢复', { chainId });
    } catch (error) {
      logger.error('RECYCLE_BIN', '恢复链条失败', { chainId }, toError(error));
      throw new Error(`恢复链条失败: ${getErrorMessage(error)}`);
    }
  }

  /**
   * 永久删除链条
   */
  static async permanentlyDelete(chainId: string): Promise<void> {
    try {
      logger.info('RECYCLE_BIN', '永久删除链条', { chainId });
      const storage = this.getStorage();
      await storage.permanentlyDeleteChain(chainId);
      logger.info('RECYCLE_BIN', '链条已永久删除', { chainId });
    } catch (error) {
      logger.error(
        'RECYCLE_BIN',
        '永久删除链条失败',
        { chainId },
        toError(error),
      );
      throw new Error(`永久删除链条失败: ${getErrorMessage(error)}`);
    }
  }

  /**
   * 批量恢复链条
   */
  static async bulkRestore(chainIds: string[]): Promise<void> {
    try {
      logger.info('RECYCLE_BIN', '批量恢复链条', { chainIds });
      const storage = this.getStorage();

      for (const chainId of chainIds) {
        await storage.restoreChain(chainId);
      }

      logger.info('RECYCLE_BIN', '成功批量恢复链条', {
        count: chainIds.length,
      });
    } catch (error) {
      logger.error(
        'RECYCLE_BIN',
        '批量恢复链条失败',
        { chainIds },
        toError(error),
      );
      throw new Error(`批量恢复链条失败: ${getErrorMessage(error)}`);
    }
  }

  /**
   * 批量永久删除链条
   */
  static async bulkPermanentDelete(chainIds: string[]): Promise<void> {
    try {
      logger.info('RECYCLE_BIN', '批量永久删除链条', { chainIds });
      const storage = this.getStorage();

      for (const chainId of chainIds) {
        await storage.permanentlyDeleteChain(chainId);
      }

      logger.info('RECYCLE_BIN', '成功批量永久删除链条', {
        count: chainIds.length,
      });
    } catch (error) {
      logger.error(
        'RECYCLE_BIN',
        '批量永久删除链条失败',
        { chainIds },
        toError(error),
      );
      throw new Error(`批量永久删除链条失败: ${getErrorMessage(error)}`);
    }
  }

  /**
   * 清理过期的已删除链条
   */
  static async cleanupExpiredChains(
    olderThanDays: number = 30,
  ): Promise<number> {
    try {
      logger.info('RECYCLE_BIN', '开始清理过期链条', { olderThanDays });
      const storage = this.getStorage();

      const deletedCount =
        await storage.cleanupExpiredDeletedChains(olderThanDays);

      logger.info('RECYCLE_BIN', '清理完成', { deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error(
        'RECYCLE_BIN',
        '清理过期链条失败',
        { olderThanDays },
        toError(error),
      );
      throw new Error(`清理过期链条失败: ${getErrorMessage(error)}`);
    }
  }

  /**
   * 获取回收箱统计信息
   */
  static async getRecycleBinStats(): Promise<{
    totalDeleted: number;
    expiringSoon: number; // 7天内将被自动删除的数量
  }> {
    try {
      const deletedChains = await this.getDeletedChains();
      const now = new Date();
      const sevenDaysFromNow = new Date(now);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const retentionDays = 30;
      const expiringSoon = deletedChains.filter((chain) => {
        const expiresAt = new Date(chain.deletedAt);
        expiresAt.setDate(expiresAt.getDate() + retentionDays);
        return expiresAt <= sevenDaysFromNow && expiresAt >= now;
      }).length;

      return {
        totalDeleted: deletedChains.length,
        expiringSoon,
      };
    } catch (error) {
      logger.warn(
        'RECYCLE_BIN',
        '获取回收箱统计信息失败',
        undefined,
        toError(error),
      );
      return { totalDeleted: 0, expiringSoon: 0 };
    }
  }
}
