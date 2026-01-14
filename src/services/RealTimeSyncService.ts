import React from 'react';
import type { MomentumStorage } from '../storage/MomentumStorage';
import type { Chain } from '../types';
import { logger } from '../utils/logger';
import { isDev } from '../utils/env';

/**
 * Real-time synchronization service for immediate UI updates
 * Ensures data consistency across operations and provides instant feedback
 */
class RealTimeSyncService {
  private syncCallbacks: Map<string, ((data: any) => void)[]> = new Map();
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
    logger.info('REALTIME_SYNC', `${enabled ? 'Enabled' : 'Disabled'} real-time synchronization`);
  }
  
  /**
   * Subscribe to data changes for a specific data type
   */
  subscribe(dataType: 'chains' | 'sessions' | 'history', callback: (data: any) => void): () => void {
    if (!this.syncCallbacks.has(dataType)) {
      this.syncCallbacks.set(dataType, []);
    }
    this.syncCallbacks.get(dataType)!.push(callback);
    
    // Return unsubscribe function
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
  private async notifySubscribers(dataType: 'chains' | 'sessions' | 'history', freshData?: any): Promise<void> {
    if (!this.isEnabled) return;
    
    const callbacks = this.syncCallbacks.get(dataType);
    if (!callbacks || callbacks.length === 0) return;
    
    try {
      let data = freshData;
      
      // Fetch fresh data if not provided
      if (!data) {
        const storage = this.storage;
        if (!storage) {
          logger.warn('REALTIME_SYNC', 'No storage configured; skipping refresh', { dataType });
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
      
      // Notify all subscribers
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          logger.error('REALTIME_SYNC', 'Error in subscriber callback', { dataType }, errorObj);
        }
      });
      
      logger.debug('REALTIME_SYNC', 'Notified subscribers', { dataType, subscriberCount: callbacks.length });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error('REALTIME_SYNC', 'Failed to fetch fresh data', { dataType }, errorObj);
    }
  }
  
  /**
   * Trigger synchronization after a database operation
   */
  async syncAfterOperation(
    dataType: 'chains' | 'sessions' | 'history', 
    operationType: 'create' | 'update' | 'delete' | 'restore',
    freshData?: any
  ): Promise<void> {
    if (!this.isEnabled) return;
    
    logger.debug('REALTIME_SYNC', 'Syncing after operation', { dataType, operationType });
    
    // Notify subscribers with fresh data
    await this.notifySubscribers(dataType, freshData);
    
    this.lastSyncTimestamp = Date.now();
  }
  
  /**
   * Force a complete data refresh for all subscribers
   */
  async forceRefresh(): Promise<void> {
    if (!this.isEnabled) return;
    
    logger.debug('REALTIME_SYNC', 'Forcing complete data refresh');
    
    // Notify all subscribers to refresh their data
    await Promise.all([
      this.notifySubscribers('chains'),
      this.notifySubscribers('sessions'), 
      this.notifySubscribers('history')
    ]);
    
    this.lastSyncTimestamp = Date.now();
  }
  
  /**
   * Clear all cache layers immediately - critical for delete operations
   */
  async clearAllCaches(storage?: MomentumStorage): Promise<void> {
    // MomentumStorage implementations may maintain internal caches (e.g. schema verification).
    // Keep this operation narrowly scoped: clear storage-level caches only.
    if (storage) {
      try {
        storage.clearCache();
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logger.warn('REALTIME_SYNC', 'Failed to clear storage cache', undefined, errorObj);
      }
    }

    this.lastSyncTimestamp = Date.now();
  }
  
  /**
   * Get sync statistics
   */
  getStats() {
    return {
      subscriberCount: Array.from(this.syncCallbacks.values()).reduce((total, callbacks) => total + callbacks.length, 0),
      dataTypes: Array.from(this.syncCallbacks.keys()),
      lastSyncTimestamp: this.lastSyncTimestamp,
      isEnabled: this.isEnabled
    };
  }
  
  /**
   * Enhanced delete operation with real-time sync
   */
  async deleteWithSync(storage: MomentumStorage, chainId: string): Promise<Chain[]> {
    logger.info('REALTIME_SYNC', 'Starting delete operation', { chainId });

    // Perform database operation
    await storage.softDeleteChain(chainId);

    // Get fresh data with forced cache bypass
    const freshChains = await storage.getActiveChains();
    
    // Trigger real-time sync with additional cache clearing
    await this.syncAfterOperation('chains', 'delete', freshChains);
    
    return freshChains;
  }
  
  /**
   * Enhanced restore operation with real-time sync
   */
  async restoreWithSync(storage: MomentumStorage, chainIds: string[]): Promise<Chain[]> {
    logger.info('REALTIME_SYNC', 'Starting restore operation', { chainIds });
    
    const results = {
      successful: [] as string[],
      failed: [] as { id: string; error: string }[]
    };

    // ENHANCED: Process each chain individually with better error handling
    for (const chainId of chainIds) {
      try {
        logger.debug('REALTIME_SYNC', 'Restoring chain', { chainId });
        await storage.restoreChain(chainId);
        results.successful.push(chainId);
        logger.debug('REALTIME_SYNC', 'Successfully restored chain', { chainId });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ id: chainId, error: errorMessage });
        logger.warn('REALTIME_SYNC', 'Failed to restore chain', { chainId, errorMessage });
      }
    }

    // Get fresh data immediately with forced cache bypass
    logger.debug('REALTIME_SYNC', 'Fetching fresh chains after restore operation');
    const freshChains = await storage.getActiveChains();
    
    // Trigger real-time sync with fresh data
    await this.syncAfterOperation('chains', 'restore', freshChains);
    
    // Log operation summary
    logger.info('REALTIME_SYNC', 'Restore operation completed', {
      total: chainIds.length,
      successful: results.successful.length,
      failed: results.failed.length,
      failures: results.failed,
    });

    // Throw error if all operations failed
    if (results.failed.length === chainIds.length) {
      throw new Error(`All restore operations failed: ${results.failed.map(f => f.error).join('; ')}`);
    }
    
    // Log partial failures but don't throw error
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
  async permanentDeleteWithSync(storage: MomentumStorage, chainIds: string[]): Promise<Chain[]> {
    logger.info('REALTIME_SYNC', 'Starting permanent delete operation', { chainIds });
    
    // Perform database operations
    for (const chainId of chainIds) {
      await storage.permanentlyDeleteChain(chainId);
    }

    // Get fresh data immediately
    const freshChains = await storage.getActiveChains();
    
    // Trigger real-time sync
    await this.syncAfterOperation('chains', 'delete', freshChains);
    
    return freshChains;
  }
  
  /**
   * Enhanced save operation with real-time sync
   */
  async saveWithSync(storage: MomentumStorage, chains: Chain[]): Promise<Chain[]> {
    logger.debug('REALTIME_SYNC', 'Starting save operation', { chainCount: chains.length });

    // Perform database operation
    await storage.saveChains(chains);

    // Get fresh active chains
    const freshChains = await storage.getActiveChains();
    
    // Trigger real-time sync
    await this.syncAfterOperation('chains', 'update', freshChains);
    
    return freshChains;
  }
}

// Singleton instance
export const realTimeSyncService = new RealTimeSyncService();

// Auto-enable in development for better debugging
if (isDev) {
  realTimeSyncService.setEnabled(true);

  if (typeof window !== 'undefined') {
    window.__realTimeSync = realTimeSyncService;
  }
}

/**
 * React hook for real-time data synchronization
 */
export const useRealTimeSync = (dataType: 'chains' | 'sessions' | 'history') => {
  const [data, setData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = realTimeSyncService.subscribe(dataType, (freshData) => {
      setData(freshData);
      setIsLoading(false);
    });
    
    return unsubscribe;
  }, [dataType]);
  
  const forceRefresh = React.useCallback(() => {
    realTimeSyncService.forceRefresh();
  }, []);
  
  return { data, isLoading, forceRefresh };
};
