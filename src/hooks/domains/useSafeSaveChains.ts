import { useCallback } from 'react';
import type { Chain } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { realTimeSyncService } from '../../services/RealTimeSyncService';

export function useSafeSaveChains(storage: MomentumStorage) {
  return useCallback(
    async function safelySaveChains(updatedActiveChains: Chain[], retryCount: number = 0): Promise<void> {
      const maxRetries = 3;
      try {
        console.log(`[APP] Starting safe save operation for chains (attempt ${retryCount + 1})...`);

        const allExistingChains = await storage.getChains();
        const deletedChains = allExistingChains.filter(chain => chain.deletedAt != null);

        const allUpdatedChains = [...updatedActiveChains, ...deletedChains];

        await realTimeSyncService.saveWithSync(storage, allUpdatedChains);

        console.log('[APP] Safe save completed successfully with enhanced synchronization');
      } catch (error) {
        console.error(`[APP] Safe save failed (attempt ${retryCount + 1}):`, error);

        if (retryCount < maxRetries) {
          const retryDelay = Math.pow(2, retryCount) * 1000;
          console.log(`[APP] Retrying safe save in ${retryDelay}ms...`);

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

