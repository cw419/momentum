import { Chain, ChainTreeNode } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { performanceLogger } from '../performanceLogger';
import { reactPerformanceMonitor } from '../reactPerformanceMonitor';
import { invalidateCache, type CacheMap } from './cache';
import { ChainTreeCache } from './chainTreeCache';
import { deduplicateQuery, type PendingQueriesMap } from './dedupe';
import type { BatchedData } from './types';

class QueryOptimizer {
  private cache: CacheMap = new Map();
  private pendingQueries: PendingQueriesMap = new Map();
  // Kept as a mutable instance field for test overrides (see queryOptimizer.test.ts).
  private CACHE_TTL = 30 * 1000; // 30 seconds
  private readonly chainTreeCache: ChainTreeCache;

  constructor() {
    this.chainTreeCache = new ChainTreeCache(this.cache, () => this.CACHE_TTL);
  }

  async deduplicateQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
  ): Promise<T> {
    return deduplicateQuery<T>({
      key,
      queryFn,
      cache: this.cache,
      pendingQueries: this.pendingQueries,
      cacheTtlMs: this.CACHE_TTL,
      dependencies: [key.split(':')[0]], // Use operation type as dependency
    });
  }

  memoizedBuildChainTree(chains: Chain[], revision?: number): ChainTreeNode[] {
    return this.chainTreeCache.memoizedBuildChainTree(chains, revision);
  }

  async batchLoadData(storage: MomentumStorage): Promise<BatchedData> {
    const cacheKey = 'batchedData';

    return this.deduplicateQuery(cacheKey, async () => {
      performanceLogger.debug('[QUERY_OPTIMIZER] Batch loading data...');
      const startTime = performance.now();

      const [chains, scheduledSessions, activeSession, completionHistory] =
        await Promise.all([
          storage.getActiveChains(),
          storage.getScheduledSessions(),
          storage.getActiveSession(),
          storage.getCompletionHistory(),
        ]);

      const endTime = performance.now();
      performanceLogger.debug(
        `[QUERY_OPTIMIZER] Batch load completed in ${(endTime - startTime).toFixed(2)}ms`,
      );

      return {
        chains,
        scheduledSessions,
        activeSession,
        completionHistory,
      };
    });
  }

  async getOptimizedChains(storage: MomentumStorage): Promise<Chain[]> {
    return this.deduplicateQuery('chains:getActive', () =>
      storage.getActiveChains(),
    );
  }

  clearCache(): void {
    performanceLogger.debugLazy(
      '[QUERY_OPTIMIZER] Clearing all caches - current state',
      () => this.getCacheStats(),
    );

    this.cache.clear();
    this.pendingQueries.clear();
    this.chainTreeCache.clear();

    performanceLogger.debugLazy(
      '[QUERY_OPTIMIZER] All caches cleared successfully',
      () => this.getCacheStats(),
    );
    performanceLogger.debug('[QUERY_OPTIMIZER] Cache cleared');
  }

  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingQueries: this.pendingQueries.size,
      cacheKeys: Array.from(this.cache.keys()),
    };
  }

  getPerformanceStats() {
    const cacheStats = this.getCacheStats();
    const reactStats = reactPerformanceMonitor.getStats();

    return {
      cache: cacheStats,
      react: reactStats,
    };
  }

  generatePerformanceReport() {
    const cacheStats = this.getCacheStats();
    const reactStats = reactPerformanceMonitor.generateReport();

    performanceLogger.group('🔧 Query Optimizer Stats', () => {
      performanceLogger.log(
        `  – Active cache entries: ${cacheStats.cacheSize}`,
      );
      performanceLogger.log(
        `  – Pending queries: ${cacheStats.pendingQueries}`,
      );
      performanceLogger.log(
        `  – Cache keys: ${cacheStats.cacheKeys.join(', ')}`,
      );
    });

    return {
      cache: cacheStats,
      react: reactStats,
    };
  }

  onDataChange(dataType: 'chains' | 'sessions' | 'history'): void {
    performanceLogger.debug(
      `[QUERY_OPTIMIZER] Data change detected for: ${dataType}, invalidating relevant caches`,
    );
    performanceLogger.debug(
      `[QUERY_OPTIMIZER] Invalidating caches for: ${dataType}`,
    );

    if (dataType === 'chains') {
      performanceLogger.debug(
        '[QUERY_OPTIMIZER] Chains data changed - clearing chain cache and tree cache',
      );
      invalidateCache(this.cache, 'chains');
      this.chainTreeCache.clear();
      performanceLogger.debug(
        '[QUERY_OPTIMIZER] Chain caches cleared, lastChainHash reset',
      );
    }

    performanceLogger.debug('[QUERY_OPTIMIZER] Clearing batched data cache');
    invalidateCache(this.cache, 'batchedData');

    performanceLogger.debugLazy(
      '[QUERY_OPTIMIZER] Post-invalidation cache stats',
      () => this.getCacheStats(),
    );
  }
}

export const queryOptimizer = new QueryOptimizer();
