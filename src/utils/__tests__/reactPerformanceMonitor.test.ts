import { beforeEach, describe, expect, it, vi } from 'vitest';

type PerformanceLoggerMock = {
  log: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  group: ReturnType<typeof vi.fn>;
};

async function loadMonitor(isDev: boolean): Promise<{
  monitor: typeof import('../reactPerformanceMonitor').reactPerformanceMonitor;
  logger: PerformanceLoggerMock;
}> {
  vi.resetModules();

  const logger: PerformanceLoggerMock = {
    log: vi.fn(),
    warn: vi.fn(),
    group: vi.fn((_label: string, fn: () => void) => fn()),
  };

  vi.doMock('../env', () => ({ isDev }));
  vi.doMock('../performanceLogger', () => ({ performanceLogger: logger }));

  const module = await import('../reactPerformanceMonitor');
  module.reactPerformanceMonitor.reset();

  return {
    monitor: module.reactPerformanceMonitor,
    logger,
  };
}

describe('reactPerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tracks render, tree and cache metrics', async () => {
    const { monitor, logger } = await loadMonitor(true);

    monitor.trackRender('Dashboard', 12);
    monitor.trackRender('Dashboard', 20);
    monitor.trackTreeBuild(8);
    monitor.trackTreeBuild(15);
    monitor.trackCacheHit();
    monitor.trackCacheHit();
    monitor.trackCacheMiss();

    const stats = monitor.getStats();

    expect(stats.totalRenders).toBe(2);
    expect(stats.totalTreeBuilds).toBe(2);
    expect(stats.avgRenderTime).toBe('16.00');
    expect(stats.maxTreeBuildTime).toBe('15.00');
    expect(stats.cacheHitRate).toBe('66.7');
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('generates report and emits recommendation warnings when thresholds are exceeded', async () => {
    const { monitor, logger } = await loadMonitor(true);

    monitor.trackRender('HeavyComponent', 25);
    monitor.trackTreeBuild(12);
    monitor.trackCacheMiss();

    const report = monitor.generateReport();

    expect(report.totalRenders).toBe(1);
    expect(report.totalTreeBuilds).toBe(1);
    expect(report.cacheHitRate).toBe('0.0');
    expect(logger.group).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('does not emit slow warnings in non-dev mode', async () => {
    const { monitor, logger } = await loadMonitor(false);

    monitor.trackRender('ProdComponent', 50);
    monitor.trackTreeBuild(40);

    expect(logger.warn).not.toHaveBeenCalled();
    expect(monitor.getStats().totalRenders).toBe(1);
    expect(monitor.getStats().totalTreeBuilds).toBe(1);
  });
});
