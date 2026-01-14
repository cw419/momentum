import { describe, expect, it } from 'vitest';
import { performanceUtils } from '../../test/setup.performance';

describe('Performance test harness', () => {
  it('measures sync operations', () => {
    const measurement = performanceUtils.measureSyncOperation(() => 42);
    expect(measurement.result).toBe(42);
    expect(measurement.duration).toBeGreaterThan(0);
  });

  it('measures async operations', async () => {
    const measurement = await performanceUtils.measureAsyncOperation(async () => 'ok');
    expect(measurement.result).toBe('ok');
    expect(measurement.duration).toBeGreaterThan(0);
  });
});

