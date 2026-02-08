import { performanceLogger } from '../performanceLogger';
import type { PerformanceBufferEntry } from './types';

export function addToBuffer(
  buffer: PerformanceBufferEntry[],
  maxBufferSize: number,
  entry: PerformanceBufferEntry,
) {
  if (buffer.length >= maxBufferSize) {
    buffer.shift();
  }
  buffer.push(entry);
}

export async function processBatchData(args: {
  buffer: PerformanceBufferEntry[];
  reportingEnabled: boolean;
  backgroundMode: boolean;
}): Promise<void> {
  const { buffer, reportingEnabled, backgroundMode } = args;

  if (buffer.length === 0) return;

  return new Promise<void>((resolve) => {
    requestIdleCallback(() => {
      const batchData = buffer.splice(0, buffer.length);

      if (reportingEnabled && !backgroundMode) {
        performanceLogger.debug(
          '批量处理性能数据:',
          batchData.length,
          '条记录',
        );
      }

      resolve();
    });
  });
}
