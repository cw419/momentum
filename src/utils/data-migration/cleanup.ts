import { storage } from '../storage';
import { localPreferences } from '../localPreferences';
import { logger } from '../logger';
import { toError } from '../errorMessage';

export async function cleanupInvalidData(): Promise<void> {
  try {
    localPreferences.cleanupExpiredTimers();

    const chains = storage.getChains();
    const stats = storage.getTaskTimeStats();
    const validChainIds = new Set(chains.map((c) => c.id));

    const validStats = stats.filter((stat) => validChainIds.has(stat.chainId));

    if (validStats.length !== stats.length) {
      storage.saveTaskTimeStats(validStats);
    }
  } catch (error) {
    logger.warn('DATA_MIGRATION', '清理无效数据时出错', undefined, toError(error));
  }
}

