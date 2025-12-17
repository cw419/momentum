import { useCallback } from 'react';
import type { Chain } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { realTimeSyncService } from '../../services/RealTimeSyncService';
import { logger } from '../../utils/logger';
import { isDev } from '../../utils/env';

export function useSafeSaveChains(storage: MomentumStorage) {
  return useCallback(
    async function safelySaveChains(updatedActiveChains: Chain[], retryCount: number = 0): Promise<void> {
      const maxRetries = 3;
      try {
        if (isDev) {
          logger.debug('SAFE_SAVE', 'Starting safe save operation for chains', { attempt: retryCount + 1 });
        }

        const allExistingChains = await storage.getChains();
        const deletedChains = allExistingChains.filter(chain => chain.deletedAt != null);

        const allUpdatedChains = [...updatedActiveChains, ...deletedChains];

        await realTimeSyncService.saveWithSync(storage, allUpdatedChains);

        if (isDev) {
          logger.debug('SAFE_SAVE', 'Safe save completed successfully with enhanced synchronization');
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('SAFE_SAVE', 'Safe save failed', { attempt: retryCount + 1 }, err);

        if (retryCount < maxRetries) {
          const retryDelay = Math.pow(2, retryCount) * 1000;
          if (isDev) {
            logger.debug('SAFE_SAVE', 'Retrying safe save', { retryDelayMs: retryDelay, nextAttempt: retryCount + 2 });
          }

          await realTimeSyncService.clearAllCaches(storage);

          return new Promise((resolve, reject) => {
            setTimeout(async () => {
              try {
                await safelySaveChains(updatedActiveChains, retryCount + 1);
                resolve();
              } catch (retryError) {
                reject(retryError);
              }
            }, retryDelay);
          });
        }

        throw error;
      }
    },
    [storage]
  );
}
