import { Chain, ScheduledSession, ActiveSession, CompletionHistory, ChainTreeNode } from '../types';
import { buildChainTree } from './chainTree';
import { performanceLogger } from './performanceLogger';
import { reactPerformanceMonitor } from './reactPerformanceMonitor';
import type { MomentumStorage } from '../storage/MomentumStorage';

/**
 * Database Query Optimizer - Reduces redundant calls and implements intelligent caching
 * 
 * Key optimizations:
 * 1. Query deduplication - Prevent multiple identical queries
 * 2. Batch operations - Combine related queries  
 * 3. Memoized chain tree building
 * 4. Intelligent cache invalidation
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  dependencies?: string[];
}

interface BatchedData {
  chains: Chain[];
  scheduledSessions: ScheduledSession[];
  activeSession: ActiveSession | null;
  completionHistory: CompletionHistory[];
}

class QueryOptimizer {
  private cache = new Map<string, CacheEntry<unknown>>();
  private pendingQueries = new Map<string, Promise<unknown>>();
  private readonly CACHE_TTL = 30 * 1000; // 30 seconds
  private readonly TREE_CACHE_KEY = 'chainTree';
  private lastChainHash: string = '';
  private lastChainsRevision: number | null = null;
  
  /**
   * Generate hash for chain data to detect changes
   * Enhanced version that considers more granular changes
   */
  private generateChainHash(chains: Chain[]): string {
    // Include more details to detect subtle changes that affect tree structure
    return chains
      .map(c => `${c.id}-${c.parentId || 'ROOT'}-${c.name}-${c.sortOrder}-${c.type}-${c.currentStreak}-${c.totalCompletions}`)
      .sort()
      .join('|');
  }
  
  /**
   * Get cached data if still valid
   */
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }
  
  /**
   * Cache data with dependencies
   */
  private setCachedData<T>(key: string, data: T, dependencies?: string[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      dependencies
    });
  }
  
  /**
   * Invalidate cache entries based on dependencies
   */
  private invalidateCache(dependency: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.dependencies?.includes(dependency)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Deduplicate identical queries in progress
   */
  async deduplicateQuery<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
    // If query is already pending, return the same promise
    if (this.pendingQueries.has(key)) {
      return this.pendingQueries.get(key) as Promise<T>;
    }
    
    // Check cache first
    const cached = this.getCachedData<T>(key);
    if (cached !== null) {
      performanceLogger.debug(`[QUERY_OPTIMIZER] Cache hit for: ${key}`);
      return cached;
    }
    
    performanceLogger.debug(`[QUERY_OPTIMIZER] Executing fresh query: ${key}`);
    
    // Execute query and store promise
    const promise = queryFn().finally(() => {
      this.pendingQueries.delete(key);
    });
    
    this.pendingQueries.set(key, promise);
    
    const result = await promise;
    this.setCachedData(key, result, [key.split(':')[0]]); // Use operation type as dependency
    return result;
  }
  
  /**
   * Advanced optimized chain tree building with intelligent caching
   * Uses multiple layers of optimization for maximum performance
   */
  private buildChainTreeWithMonitoring(
    chains: Chain[],
    onCache: (tree: ChainTreeNode[]) => void
  ): ChainTreeNode[] {
    return performanceLogger.time('buildChainTree-full', () => {
      const startTime = performance.now();
      const tree = buildChainTree(chains);
      const buildTime = performance.now() - startTime;

      reactPerformanceMonitor.trackTreeBuild(buildTime);
      onCache(tree);

      performanceLogger.debug(
        `[QUERY_OPTIMIZER] Tree built with ${tree.length} root nodes in ${buildTime.toFixed(2)}ms`
      );

      return tree;
    });
  }

  memoizedBuildChainTree(chains: Chain[], revision?: number): ChainTreeNode[] {
    // Preferred fast path: caller provides a monotonic revision number.
    if (typeof revision === 'number') {
      const cached = this.getCachedData<ChainTreeNode[]>(this.TREE_CACHE_KEY);
      if (cached && this.lastChainsRevision === revision) {
        reactPerformanceMonitor.trackCacheHit();
        performanceLogger.debug('[QUERY_OPTIMIZER] Using cached chain tree (revision match)');
        return cached;
      }

      performanceLogger.debug('[QUERY_OPTIMIZER] Rebuilding chain tree (revision changed or cache expired)');
      reactPerformanceMonitor.trackCacheMiss();

      return this.buildChainTreeWithMonitoring(chains, (tree) => {
        this.setCachedData(this.TREE_CACHE_KEY, tree);
        this.lastChainsRevision = revision;
      });
    }

    // Fallback path: compute hashes (more expensive) when revision is not available.
    const currentHash = this.generateChainHash(chains);

    // Level 1: Check if data hasn't changed at all
    if (currentHash === this.lastChainHash) {
      const cached = this.getCachedData<ChainTreeNode[]>(this.TREE_CACHE_KEY);
      if (cached) {
        reactPerformanceMonitor.trackCacheHit();
        performanceLogger.debug('[QUERY_OPTIMIZER] Using cached chain tree (hash match)');
        return cached;
      }
    }

    // Level 2: Check for structural changes only (for incremental updates in the future)
    const structuralHash = this.generateStructuralHash(chains);
    const cachedStructuralHash = this.getCachedData<string>(`${this.TREE_CACHE_KEY}_structural`);

    if (structuralHash === cachedStructuralHash) {
      performanceLogger.debug('[QUERY_OPTIMIZER] Structural hash unchanged, could optimize with incremental update');
    }

    performanceLogger.debug('[QUERY_OPTIMIZER] Rebuilding chain tree (hash path)');
    reactPerformanceMonitor.trackCacheMiss();

    return this.buildChainTreeWithMonitoring(chains, (tree) => {
      // Cache both the tree and the structural hash
      this.setCachedData(this.TREE_CACHE_KEY, tree);
      this.setCachedData(`${this.TREE_CACHE_KEY}_structural`, structuralHash);
      this.lastChainHash = currentHash;
    });
  }
  
  /**
   * Generate structural hash (ignores metadata like completion counts)
   * Used for detecting when only metadata changed vs structural changes
   */
  private generateStructuralHash(chains: Chain[]): string {
    return chains
      .map(c => `${c.id}-${c.parentId || 'ROOT'}-${c.sortOrder}-${c.type}`)
      .sort()
      .join('|');
  }
  
  /**
   * Batch load all related data in a single optimized operation
   */
  async batchLoadData(storage: MomentumStorage): Promise<BatchedData> {
    const cacheKey = 'batchedData';
    
    return this.deduplicateQuery(cacheKey, async () => {
      performanceLogger.debug('[QUERY_OPTIMIZER] Batch loading data...');
      const startTime = performance.now();
      
      // Execute all queries in parallel for maximum performance
      const [chains, scheduledSessions, activeSession, completionHistory] = await Promise.all([
        storage.getActiveChains(),
        storage.getScheduledSessions(),
        storage.getActiveSession(),
        storage.getCompletionHistory()
      ]);
      
      const endTime = performance.now();
      performanceLogger.debug(`[QUERY_OPTIMIZER] Batch load completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      return {
        chains,
        scheduledSessions,
        activeSession,
        completionHistory
      };
    });
  }
  
  /**
   * Optimized getChains with deduplication
   */
  async getOptimizedChains(storage: MomentumStorage): Promise<Chain[]> {
    return this.deduplicateQuery('chains:getActive', () => storage.getActiveChains());
  }
  
  /**
   * Clear all caches (useful for forced refresh)
   */
  clearCache(): void {
    performanceLogger.debugLazy('[QUERY_OPTIMIZER] Clearing all caches - current state', () => this.getCacheStats());
    
    this.cache.clear();
    this.pendingQueries.clear();
    this.lastChainHash = '';
    this.lastChainsRevision = null;
    
    performanceLogger.debugLazy('[QUERY_OPTIMIZER] All caches cleared successfully', () => this.getCacheStats());
    performanceLogger.debug('[QUERY_OPTIMIZER] Cache cleared');
  }
  
  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingQueries: this.pendingQueries.size,
      cacheKeys: Array.from(this.cache.keys())
    };
  }
  
  /**
   * Get performance stats without logging (for UI display)
   */
  getPerformanceStats() {
    const cacheStats = this.getCacheStats();
    const reactStats = reactPerformanceMonitor.getStats();
    
    return {
      cache: cacheStats,
      react: reactStats,
    };
  }

  /**
   * Generate performance report combining cache and React metrics (with logging)
   */
  generatePerformanceReport() {
    const cacheStats = this.getCacheStats();
    const reactStats = reactPerformanceMonitor.generateReport();
    
    performanceLogger.group('🔧 Query Optimizer Stats', () => {
      performanceLogger.log(`  • Active cache entries: ${cacheStats.cacheSize}`);
      performanceLogger.log(`  • Pending queries: ${cacheStats.pendingQueries}`);
      performanceLogger.log(`  • Cache keys: ${cacheStats.cacheKeys.join(', ')}`);
    });
    
    return {
      cache: cacheStats,
      react: reactStats,
    };
  }
  
  /**
   * Invalidate caches when data changes
   */
  onDataChange(dataType: 'chains' | 'sessions' | 'history'): void {
    performanceLogger.debug(`[QUERY_OPTIMIZER] Data change detected for: ${dataType}, invalidating relevant caches`);
    performanceLogger.debug(`[QUERY_OPTIMIZER] Invalidating caches for: ${dataType}`);
    
    if (dataType === 'chains') {
      performanceLogger.debug('[QUERY_OPTIMIZER] Chains data changed - clearing chain cache and tree cache');
      this.invalidateCache('chains');
      this.cache.delete(this.TREE_CACHE_KEY);
      this.lastChainHash = '';
      this.lastChainsRevision = null;
      performanceLogger.debug('[QUERY_OPTIMIZER] Chain caches cleared, lastChainHash reset');
    }
    
    performanceLogger.debug('[QUERY_OPTIMIZER] Clearing batched data cache');
    this.invalidateCache('batchedData');
    
    // Log current cache state for debugging
    performanceLogger.debugLazy('[QUERY_OPTIMIZER] Post-invalidation cache stats', () => this.getCacheStats());
  }
}

// Singleton instance for global use
export const queryOptimizer = new QueryOptimizer();
