import { performanceLogger } from '../performanceLogger';
import { isLayoutShiftEntry } from './layoutShift';
import type { PerformanceBufferEntry, PerformanceMetrics, PerformanceObservers } from './types';

export function createPerformanceObservers(args: {
  isMonitoring: boolean;
  backgroundMode: boolean;
  metrics: PerformanceMetrics;
  addToBuffer: (entry: PerformanceBufferEntry) => void;
  runWhenIdle: (callback: () => void, timeout?: number) => void;
}): PerformanceObservers {
  const { isMonitoring, backgroundMode, metrics, addToBuffer, runWhenIdle } = args;

  if (typeof window === 'undefined') return {};
  if (!isMonitoring) return {};
  if (!('PerformanceObserver' in window)) return {};

  const observers: PerformanceObservers = {};

  try {
    observers.layout = new PerformanceObserver((list) => {
      runWhenIdle(() => {
        for (const entry of list.getEntries()) {
          if (isLayoutShiftEntry(entry) && !entry.hadRecentInput) {
            metrics.layoutShifts += entry.value;

            if (backgroundMode) {
              addToBuffer({
                type: 'layout-shift',
                value: entry.value,
                timestamp: Date.now(),
              });
            } else if (entry.value > 0.1) {
              performanceLogger.warn('🚨 检测到大幅布局偏移:', {
                value: entry.value,
                sources: entry.sources,
              });
            }
          }
        }
      });
    });

    observers.layout.observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    if (!backgroundMode) {
      performanceLogger.warn('布局偏移监控不可用:', e);
    }
  }

  try {
    observers.paint = new PerformanceObserver((list) => {
      runWhenIdle(() => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            metrics.renderTime = entry.startTime;
            addToBuffer({
              type: 'paint',
              name: entry.name,
              startTime: entry.startTime,
              timestamp: Date.now(),
            });
          }
        }
      });
    });

    observers.paint.observe({ entryTypes: ['paint'] });
  } catch (e) {
    if (!backgroundMode) {
      performanceLogger.warn('绘制性能监控不可用:', e);
    }
  }

  try {
    observers.measure = new PerformanceObserver((list) => {
      runWhenIdle(() => {
        for (const entry of list.getEntries()) {
          if (entry.name.startsWith('chain-editor-')) {
            addToBuffer({
              type: 'measure',
              name: entry.name,
              duration: entry.duration,
              timestamp: Date.now(),
            });

            if (!backgroundMode) {
              performanceLogger.debug('性能测量:', entry.name, entry.duration + 'ms');
            }
          }
        }
      });
    });

    observers.measure.observe({ entryTypes: ['measure'] });
  } catch (e) {
    if (!backgroundMode) {
      performanceLogger.warn('自定义测量监控不可用:', e);
    }
  }

  return observers;
}

