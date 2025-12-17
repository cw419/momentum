/**
 * Performance report utility to track React optimization improvements
 */

import { performanceLogger } from './performanceLogger';
import { isDev } from './env';

interface PerformanceMetrics {
  renderTimes: number[];
  treeBuilds: number[];
  cacheHits: number;
  cacheMisses: number;
  totalRenders: number;
  totalTreeBuilds: number;
}

class ReactPerformanceMonitor {
  private metrics: PerformanceMetrics = {
    renderTimes: [],
    treeBuilds: [],
    cacheHits: 0,
    cacheMisses: 0,
    totalRenders: 0,
    totalTreeBuilds: 0,
  };

  /**
   * Track a component render time
   */
  trackRender(componentName: string, renderTime: number) {
    this.metrics.renderTimes.push(renderTime);
    this.metrics.totalRenders++;
    
    if (isDev && renderTime > 16) {
      performanceLogger.warn(`[PERF] Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Track chain tree build time
   */
  trackTreeBuild(buildTime: number) {
    this.metrics.treeBuilds.push(buildTime);
    this.metrics.totalTreeBuilds++;
    
    if (isDev && buildTime > 10) {
      performanceLogger.warn(`[PERF] Slow tree build: ${buildTime.toFixed(2)}ms`);
    }
  }

  /**
   * Track cache hit
   */
  trackCacheHit() {
    this.metrics.cacheHits++;
  }

  /**
   * Track cache miss
   */
  trackCacheMiss() {
    this.metrics.cacheMisses++;
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const avgRenderTime = this.metrics.renderTimes.length > 0 
      ? this.metrics.renderTimes.reduce((a, b) => a + b, 0) / this.metrics.renderTimes.length
      : 0;

    const avgTreeBuildTime = this.metrics.treeBuilds.length > 0
      ? this.metrics.treeBuilds.reduce((a, b) => a + b, 0) / this.metrics.treeBuilds.length
      : 0;

    const maxRenderTime = this.metrics.renderTimes.length > 0
      ? Math.max(...this.metrics.renderTimes)
      : 0;

    const maxTreeBuildTime = this.metrics.treeBuilds.length > 0
      ? Math.max(...this.metrics.treeBuilds)
      : 0;

    const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100
      : 0;

    return {
      avgRenderTime: avgRenderTime.toFixed(2),
      maxRenderTime: maxRenderTime.toFixed(2),
      avgTreeBuildTime: avgTreeBuildTime.toFixed(2),
      maxTreeBuildTime: maxTreeBuildTime.toFixed(2),
      totalRenders: this.metrics.totalRenders,
      totalTreeBuilds: this.metrics.totalTreeBuilds,
      cacheHitRate: cacheHitRate.toFixed(1),
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
    };
  }

  /**
   * Generate a performance report
   */
  generateReport() {
    const stats = this.getStats();
    
    performanceLogger.group('📊 React Performance Report', () => {
      performanceLogger.log('🚀 Render Performance:');
      performanceLogger.log(`  • Total renders: ${stats.totalRenders}`);
      performanceLogger.log(`  • Average render time: ${stats.avgRenderTime}ms`);
      performanceLogger.log(`  • Max render time: ${stats.maxRenderTime}ms`);
      
      performanceLogger.log('🌲 Tree Build Performance:');
      performanceLogger.log(`  • Total tree builds: ${stats.totalTreeBuilds}`);
      performanceLogger.log(`  • Average build time: ${stats.avgTreeBuildTime}ms`);
      performanceLogger.log(`  • Max build time: ${stats.maxTreeBuildTime}ms`);
      
      performanceLogger.log('💾 Cache Performance:');
      performanceLogger.log(`  • Cache hit rate: ${stats.cacheHitRate}%`);
      performanceLogger.log(`  • Cache hits: ${stats.cacheHits}`);
      performanceLogger.log(`  • Cache misses: ${stats.cacheMisses}`);
      
      // Performance recommendations
      if (parseFloat(stats.avgRenderTime) > 16) {
        performanceLogger.warn('⚠️  Average render time exceeds 16ms (60 FPS threshold)');
      }
      
      if (parseFloat(stats.cacheHitRate) < 70) {
        performanceLogger.warn('⚠️  Cache hit rate below 70% - consider optimizing cache strategy');
      }
      
      if (parseFloat(stats.avgTreeBuildTime) > 5) {
        performanceLogger.warn('⚠️  Tree building is slow - consider further optimization');
      }
    });

    return stats;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      renderTimes: [],
      treeBuilds: [],
      cacheHits: 0,
      cacheMisses: 0,
      totalRenders: 0,
      totalTreeBuilds: 0,
    };
  }
}

// Singleton instance
export const reactPerformanceMonitor = new ReactPerformanceMonitor();

/**
 * React hook for performance monitoring
 */
export const usePerformanceMonitor = (componentName: string) => {
  const trackRender = (renderTime: number) => {
    reactPerformanceMonitor.trackRender(componentName, renderTime);
  };

  return { trackRender };
};
