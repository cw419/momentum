import { performanceLogger } from '../performanceLogger';
import type { PerformanceMetrics } from './types';

function getMemoryUsage(): number | undefined {
  const memory = performance.memory;
  if (memory) return memory.usedJSHeapSize / 1024 / 1024;
  return undefined;
}

export function reportMetrics(metrics: PerformanceMetrics) {
  const memoryUsage = getMemoryUsage();
  if (memoryUsage) {
    metrics.memoryUsage = memoryUsage;
  }

  performanceLogger.group('📊 ChainEditor 性能报告', () => {
    performanceLogger.log('渲染时间:', metrics.renderTime.toFixed(2) + 'ms');
    performanceLogger.log('最大交互时间:', metrics.interactionTime.toFixed(2) + 'ms');
    performanceLogger.log('累积布局偏移:', metrics.layoutShifts.toFixed(4));
    performanceLogger.log('当前FPS:', metrics.fps);
    if (memoryUsage) {
      performanceLogger.log('内存使用:', memoryUsage.toFixed(2) + 'MB');
    }
  });

  return { ...metrics };
}

export function checkPerformance(metrics: PerformanceMetrics): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  if (metrics.interactionTime > 100) {
    issues.push(`交互响应时间过长: ${metrics.interactionTime.toFixed(2)}ms`);
  }

  if (metrics.layoutShifts > 0.1) {
    issues.push(`布局偏移过大: ${metrics.layoutShifts.toFixed(4)}`);
  }

  if (metrics.fps < 30) {
    issues.push(`FPS过低: ${metrics.fps}`);
  }

  if (metrics.memoryUsage && metrics.memoryUsage > 50) {
    issues.push(`内存使用过高: ${metrics.memoryUsage.toFixed(2)}MB`);
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
