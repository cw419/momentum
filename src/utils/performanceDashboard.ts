import { queryOptimizer } from './queryOptimizer';
import { logger } from './logger';

/**
 * Performance Dashboard - Monitor query optimization and cache performance
 */

export class PerformanceDashboard {
  private static instance: PerformanceDashboard;
  private autoCaptureInterval: ReturnType<typeof setInterval> | null = null;
  private metricsHistory: Array<{
    timestamp: number;
    cacheSize: number;
    pendingQueries: number;
    hitRate: number;
  }> = [];
  
  private cacheHits = 0;
  private cacheMisses = 0;
  
  static getInstance(): PerformanceDashboard {
    if (!PerformanceDashboard.instance) {
      PerformanceDashboard.instance = new PerformanceDashboard();
    }
    return PerformanceDashboard.instance;
  }
  
  recordCacheHit(): void {
    this.cacheHits++;
  }
  
  recordCacheMiss(): void {
    this.cacheMisses++;
  }
  
  getHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? (this.cacheHits / total) * 100 : 0;
  }
  
  captureMetrics(): void {
    const stats = queryOptimizer.getCacheStats();
    const hitRate = this.getHitRate();
    
    this.metricsHistory.push({
      timestamp: Date.now(),
      cacheSize: stats.cacheSize,
      pendingQueries: stats.pendingQueries,
      hitRate
    });
    
    // Keep only last 50 entries
    if (this.metricsHistory.length > 50) {
      this.metricsHistory.shift();
    }
  }
  
  displayConsoleReport(): void {
    const stats = queryOptimizer.getCacheStats();
    const hitRate = this.getHitRate();

    logger.debug('PERFORMANCE_DASHBOARD', 'Performance dashboard report', {
      cacheSize: stats.cacheSize,
      pendingQueries: stats.pendingQueries,
      cacheHitRate: Number(hitRate.toFixed(2)),
      totalCacheHits: this.cacheHits,
      totalCacheMisses: this.cacheMisses,
      activeCacheKeys: stats.cacheKeys,
    });
  }
  
  getPerformanceReport() {
    return {
      ...queryOptimizer.getCacheStats(),
      hitRate: this.getHitRate(),
      totalHits: this.cacheHits,
      totalMisses: this.cacheMisses,
      metricsHistory: [...this.metricsHistory]
    };
  }
  
  reset(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.metricsHistory = [];
    queryOptimizer.clearCache();
  }

  start(intervalMs: number = 30000): void {
    if (this.autoCaptureInterval) return;
    this.autoCaptureInterval = setInterval(() => {
      this.captureMetrics();
    }, intervalMs);
  }

  stop(): void {
    if (!this.autoCaptureInterval) return;
    clearInterval(this.autoCaptureInterval);
    this.autoCaptureInterval = null;
  }
}

// Export singleton instance
export const performanceDashboard = PerformanceDashboard.getInstance();
