import { beforeEach, describe, expect, it, vi } from 'vitest';

type LoggerSpy = {
  debug: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  performance: ReturnType<typeof vi.fn>;
};

async function loadPerformanceLogger(isDev: boolean): Promise<{
  performanceLogger: typeof import('../performanceLogger').performanceLogger;
  logger: LoggerSpy;
}> {
  vi.resetModules();

  const logger: LoggerSpy = {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    performance: vi.fn(),
  };

  vi.doMock('../env', () => ({ isDev }));
  vi.doMock('../logger', () => ({ logger }));

  const module = await import('../performanceLogger');
  return { performanceLogger: module.performanceLogger, logger };
}

describe('performanceLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs development diagnostics and timings', async () => {
    const { performanceLogger, logger } = await loadPerformanceLogger(true);
    const nowSpy = vi
      .spyOn(performance, 'now')
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(25)
      .mockReturnValueOnce(30)
      .mockReturnValueOnce(46);

    performanceLogger.log('message', { foo: 'bar' });
    performanceLogger.warn('warn-message', new Error('warn-error'));
    performanceLogger.debug('debug-message', 123);

    const timeResult = performanceLogger.time('timed-op', () => 'done');
    let sideEffect = 0;
    performanceLogger.perf('perf-op', () => {
      sideEffect += 1;
    });

    performanceLogger.group('group-1', () => {
      performanceLogger.trace('trace-label', { payload: true });
    });

    performanceLogger.debugLazy('lazy-debug', () => ({ a: 1 }));
    performanceLogger.infoLazy('lazy-info', () => ({ b: 2 }));
    performanceLogger.logLazy('lazy-log', () => ({ c: 3 }));
    performanceLogger.warnLazy(
      'lazy-warn',
      () => ({ d: 4 }),
      new Error('boom'),
    );

    expect(timeResult).toBe('done');
    expect(sideEffect).toBe(1);
    expect(logger.debug).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.performance).toHaveBeenNthCalledWith(1, 'timed-op', 15);
    expect(logger.performance).toHaveBeenNthCalledWith(2, 'perf-op', 16);

    performanceLogger.error(
      'critical',
      { code: 'E' },
      new Error('critical-error'),
    );
    expect(logger.error).toHaveBeenCalledWith(
      'PERFORMANCE',
      'critical',
      { args: [{ code: 'E' }] },
      expect.any(Error),
    );

    nowSpy.mockRestore();
  });

  it('suppresses non-error logs in production mode', async () => {
    const { performanceLogger, logger } = await loadPerformanceLogger(false);

    performanceLogger.log('log');
    performanceLogger.warn('warn');
    performanceLogger.debug('debug');
    performanceLogger.group('group', () => {
      throw new Error('group body should not execute in prod');
    });

    const result = performanceLogger.time('time', () => 42);
    performanceLogger.perf('perf', () => undefined);
    performanceLogger.debugLazy('debugLazy', () => ({ value: 1 }));
    performanceLogger.infoLazy('infoLazy', () => ({ value: 2 }));
    performanceLogger.logLazy('logLazy', () => ({ value: 3 }));
    performanceLogger.warnLazy('warnLazy', () => ({ value: 4 }));

    performanceLogger.error('still-error');

    expect(result).toBe(42);
    expect(logger.debug).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.performance).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
