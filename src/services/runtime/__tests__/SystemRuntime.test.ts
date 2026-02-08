import { describe, expect, it, vi, beforeEach } from 'vitest';
import { systemRuntime } from '../SystemRuntime';

const cacheStartMock = vi.hoisted(() => vi.fn());
const cacheStopMock = vi.hoisted(() => vi.fn());
const monitorStartMock = vi.hoisted(() => vi.fn());
const monitorStopMock = vi.hoisted(() => vi.fn());

vi.mock('../../../utils/cache', () => ({
  exceptionRuleCache: {
    start: cacheStartMock,
    stop: cacheStopMock,
  },
}));

vi.mock('../../../utils/monitoring', () => ({
  performanceMonitor: {
    start: monitorStartMock,
    stop: monitorStopMock,
  },
  reactPerformanceMonitor: {},
  layoutStabilityMonitor: {},
  performanceLogger: {},
}));

describe('SystemRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts and stops cache through the unified cache entry', () => {
    systemRuntime.cache.start();
    systemRuntime.cache.stop();

    expect(cacheStartMock).toHaveBeenCalledTimes(1);
    expect(cacheStopMock).toHaveBeenCalledTimes(1);
  });

  it('starts and stops monitoring through the unified monitoring entry', () => {
    systemRuntime.monitoring.start();
    systemRuntime.monitoring.stop();

    expect(monitorStartMock).toHaveBeenCalledTimes(1);
    expect(monitorStopMock).toHaveBeenCalledTimes(1);
  });
});
