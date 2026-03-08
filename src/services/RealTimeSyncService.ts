import type { MomentumStorage } from '../storage/MomentumStorage';
import type { Chain } from '../types';
import { logger } from '../utils/logger';
import { toError } from '../utils/errorMessage';
import { isDev } from '../utils/env';

type RealTimeSyncDataType = 'chains' | 'sessions' | 'history';
type RealTimeSyncOperationType = 'create' | 'update' | 'delete' | 'restore';

/**
 * Real-time synchronization service for immediate UI updates
 * Ensures data consistency across operations and provides instant feedback
 */
class RealTimeSyncService {
  private syncCallbacks: Map<string, ((data: unknown) => void)[]> = new Map();
  private lastSyncTimestamp = Date.now();
  private isEnabled = true;
  private storage: MomentumStorage | null = null;

  setStorage(storage: MomentumStorage | null): void {
    this.storage = storage;
    logger.debug('REALTIME_SYNC', 'Default storage updated', {
      configured: !!storage,
      kind: storage?.kind,
    });
  }

  /**
   * Enable/disable real-time sync
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    logger.info(
      'REALTIME_SYNC',
      `${enabled ? 'Enabled' : 'Disabled'} real-time synchronization`,
    );
  }

  /**
   * Subscribe to data changes for a specific data type
   */
  subscribe(
    dataType: RealTimeSyncDataType,
    callback: (data: unknown) => void,
  ): () => void {
    if (!this.syncCallbacks.has(dataType)) {
      this.syncCallbacks.set(dataType, []);
    }
    this.syncCallbacks.get(dataType)!.push(callback);

    return () => {
      const callbacks = this.syncCallbacks.get(dataType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notify all subscribers of data changes with fresh data
   */
  private async notifySubscribers(
    dataType: RealTimeSyncDataType,
    freshData?: unknown,
  ): Promise<void> {
    if (!this.isEnabled) return;

    const callbacks = this.syncCallbacks.get(dataType);
    if (!callbacks || callbacks.length === 0) return;

    try {
      let data = freshData;

      if (!data) {
        const storage = this.storage;
        if (!storage) {
          logger.warn(
            'REALTIME_SYNC',
            'No storage configured; skipping refresh',
            { dataType },
          );
          return;
        }

        switch (dataType) {
          case 'chains':
            data = await storage.getActiveChains();
            break;
          case 'sessions':
            data = await storage.getScheduledSessions();
            break;
          case 'history':
            data = await storage.getCompletionHistory();
            break;
        }
      }

      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          logger.error(
            'REALTIME_SYNC',
            'Error in subscriber callback',
            { dataType },
            toError(error),
          );
        }
      });

      logger.debug('REALTIME_SYNC', 'Notified subscribers', {
        dataType,
        subscriberCount: callbacks.length,
      });
    } catch (error) {
      logger.error(
        'REALTIME_SYNC',
        'Failed to fetch fresh data',
        { dataType },
        toError(error),
      );
    }
  }

  /**
   * Trigger synchronization after a database operation
   */
  async syncAfterOperation(
    dataType: RealTimeSyncDataType,
    operationType: RealTimeSyncOperationType,
    freshData?: unknown,
  ): Promise<void> {
    if (!this.isEnabled) return;

    logger.debug('REALTIME_SYNC', 'Syncing after operation', {
      dataType,
      operationType,
    });

    await this.notifySubscribers(dataType, freshData);

    this.lastSyncTimestamp = Date.now();
  }

  /**
   * Force a complete data refresh for all subscribers
   */
  async forceRefresh(): Promise<void> {
    if (!this.isEnabled) return;

    logger.debug('REALTIME_SYNC', 'Forcing complete data refresh');

    await Promise.all([
      this.notifySubscribers('chains'),
      this.notifySubscribers('sessions'),
      this.notifySubscribers('history'),
    ]);

    this.lastSyncTimestamp = Date.now();
  }

  /**
   * Clear storage-level caches without touching broader UI state.
   */
  async clearAllCaches(storage?: MomentumStorage): Promise<void> {
    if (storage) {
      try {
        storage.clearCache();
      } catch (error) {
        logger.warn(
          'REALTIME_SYNC',
          'Failed to clear storage cache',
          undefined,
          toError(error),
        );
      }
    }

    this.lastSyncTimestamp = Date.now();
  }

  /**
   * Get sync statistics
   */
  getStats() {
    return {
      subscriberCount: Array.from(this.syncCallbacks.values()).reduce(
        (total, callbacks) => total + callbacks.length,
        0,
      ),
      dataTypes: Array.from(this.syncCallbacks.keys()),
      lastSyncTimestamp: this.lastSyncTimestamp,
      isEnabled: this.isEnabled,
    };
  }

  /**
   * Enhanced delete operation with real-time sync
   */
  async deleteWithSync(
    storage: MomentumStorage,
    chainId: string,
  ): Promise<Chain[]> {
    logger.info('REALTIME_SYNC', 'Starting delete operation', { chainId });

    await storage.softDeleteChain(chainId);
    const freshChains = await storage.getActiveChains();
    await this.syncAfterOperation('chains', 'delete', freshChains);

    return freshChains;
  }

  /**
   * Enhanced restore operation with real-time sync
   */
  async restoreWithSync(
    storage: MomentumStorage,
    chainIds: string[],
  ): Promise<Chain[]> {
    logger.info('REALTIME_SYNC', 'Starting restore operation', { chainIds });

    const results = {
      successful: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    for (const chainId of chainIds) {
      try {
        logger.debug('REALTIME_SYNC', 'Restoring chain', { chainId });
        await storage.restoreChain(chainId);
        results.successful.push(chainId);
        logger.debug('REALTIME_SYNC', 'Successfully restored chain', {
          chainId,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ id: chainId, error: errorMessage });
        logger.warn('REALTIME_SYNC', 'Failed to restore chain', {
          chainId,
          errorMessage,
        });
      }
    }

    logger.debug(
      'REALTIME_SYNC',
      'Fetching fresh chains after restore operation',
    );
    const freshChains = await storage.getActiveChains();

    await this.syncAfterOperation('chains', 'restore', freshChains);

    logger.info('REALTIME_SYNC', 'Restore operation completed', {
      total: chainIds.length,
      successful: results.successful.length,
      failed: results.failed.length,
      failures: results.failed,
    });

    if (results.failed.length === chainIds.length) {
      throw new Error(
        `All restore operations failed: ${results.failed.map((f) => f.error).join('; ')}`,
      );
    }

    if (results.failed.length > 0) {
      logger.warn('REALTIME_SYNC', 'Partial restore failure', {
        failedCount: results.failed.length,
        total: chainIds.length,
        failures: results.failed,
      });
    }

    return freshChains;
  }

  /**
   * Enhanced permanent delete operation with real-time sync
   */
  async permanentDeleteWithSync(
    storage: MomentumStorage,
    chainIds: string[],
  ): Promise<Chain[]> {
    logger.info('REALTIME_SYNC', 'Starting permanent delete operation', {
      chainIds,
    });

    for (const chainId of chainIds) {
      await storage.permanentlyDeleteChain(chainId);
    }

    const freshChains = await storage.getActiveChains();
    await this.syncAfterOperation('chains', 'delete', freshChains);

    return freshChains;
  }

  /**
   * Enhanced save operation with real-time sync
   */
  async saveWithSync(
    storage: MomentumStorage,
    chains: Chain[],
  ): Promise<Chain[]> {
    logger.debug('REALTIME_SYNC', 'Starting save operation', {
      chainCount: chains.length,
    });

    await storage.saveChains(chains);
    const freshChains = await storage.getActiveChains();
    await this.syncAfterOperation('chains', 'update', freshChains);

    return freshChains;
  }
}

export const realTimeSyncService = new RealTimeSyncService();

if (isDev) {
  realTimeSyncService.setEnabled(true);

  if (typeof window !== 'undefined') {
    window.__realTimeSync = realTimeSyncService;
  }
}
