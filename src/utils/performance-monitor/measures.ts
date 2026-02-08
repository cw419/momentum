import { performanceLogger } from '../performanceLogger';
import type { PerformanceBufferEntry, PerformanceMetrics } from './types';

export function measureRender<T>(args: {
  reportingEnabled: boolean;
  componentName: string;
  renderFn: () => T;
}): T {
  const { reportingEnabled, componentName, renderFn } = args;

  if (!reportingEnabled) {
    return renderFn();
  }

  const startMark = `${componentName}-render-start`;
  const endMark = `${componentName}-render-end`;
  const measureName = `chain-editor-${componentName}-render`;

  performance.mark(startMark);
  const result = renderFn();
  performance.mark(endMark);

  try {
    performance.measure(measureName, startMark, endMark);
  } catch {
    // ignore
  }

  return result;
}

export function measureInteraction<T>(args: {
  reportingEnabled: boolean;
  backgroundMode: boolean;
  metrics: PerformanceMetrics;
  interactionName: string;
  interactionFn: () => T;
  addToBuffer: (entry: PerformanceBufferEntry) => void;
}): T {
  const {
    reportingEnabled,
    backgroundMode,
    metrics,
    interactionName,
    interactionFn,
    addToBuffer,
  } = args;

  const startTime = reportingEnabled ? performance.now() : 0;
  const result = interactionFn();

  if (reportingEnabled) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    metrics.interactionTime = Math.max(metrics.interactionTime, duration);

    if (duration > 100 && !backgroundMode) {
      performanceLogger.warn(
        '🐌 交互响应较慢:',
        interactionName,
        duration + 'ms',
      );
    } else if (duration > 100) {
      addToBuffer({
        type: 'slow-interaction',
        name: interactionName,
        duration,
        timestamp: Date.now(),
      });
    }
  }

  return result;
}
