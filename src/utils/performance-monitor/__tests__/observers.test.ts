import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPerformanceObservers } from '../observers';
import type { PerformanceMetrics } from '../types';

const performanceLoggerMock = vi.hoisted(() => ({
  warn: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('../../performanceLogger', () => ({
  performanceLogger: performanceLoggerMock,
}));

type MockEntryList = {
  getEntries: () => PerformanceEntry[];
};

const instances: MockPerformanceObserver[] = [];

class MockPerformanceObserver {
  static throwOnObserveFor: string[] = [];

  observe = vi.fn((options: { entryTypes: string[] }) => {
    const type = options.entryTypes[0];
    if (type && MockPerformanceObserver.throwOnObserveFor.includes(type)) {
      throw new Error(`unsupported: ${type}`);
    }
  });

  disconnect = vi.fn();

  constructor(private readonly callback: (list: MockEntryList) => void) {
    instances.push(this);
  }

  emit(entries: PerformanceEntry[]) {
    this.callback({
      getEntries: () => entries,
    });
  }
}

function createMetrics(): PerformanceMetrics {
  return {
    renderTime: 0,
    interactionTime: 0,
    layoutShifts: 0,
    fps: 60,
  };
}

describe('performance-monitor/observers', () => {
  const originalPerformanceObserver = window.PerformanceObserver;

  beforeEach(() => {
    instances.length = 0;
    MockPerformanceObserver.throwOnObserveFor = [];
    performanceLoggerMock.warn.mockReset();
    performanceLoggerMock.debug.mockReset();
    Object.defineProperty(window, 'PerformanceObserver', {
      value: MockPerformanceObserver as unknown as typeof PerformanceObserver,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'PerformanceObserver', {
      value: originalPerformanceObserver,
      configurable: true,
      writable: true,
    });
  });

  it('returns empty observers when monitoring is disabled or API is unavailable', () => {
    const metrics = createMetrics();
    const baseArgs = {
      backgroundMode: false,
      metrics,
      addToBuffer: vi.fn(),
      runWhenIdle: (cb: () => void) => cb(),
    };

    expect(createPerformanceObservers({ ...baseArgs, isMonitoring: false })).toEqual({});

    Object.defineProperty(window, 'PerformanceObserver', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    expect(createPerformanceObservers({ ...baseArgs, isMonitoring: true })).toEqual({});

  });

  it('returns empty observers when window is unavailable', () => {
    const metrics = createMetrics();
    const addToBuffer = vi.fn();
    const originalWindow = globalThis.window;

    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    expect(
      createPerformanceObservers({
        isMonitoring: true,
        backgroundMode: false,
        metrics,
        addToBuffer,
        runWhenIdle: (cb: () => void) => cb(),
      })
    ).toEqual({});

    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  });

  it('wires observers and updates metrics/buffer for emitted performance entries', () => {
    const metrics = createMetrics();
    const addToBuffer = vi.fn();

    const observers = createPerformanceObservers({
      isMonitoring: true,
      backgroundMode: false,
      metrics,
      addToBuffer,
      runWhenIdle: (cb: () => void) => cb(),
    });

    expect(observers.layout).toBeDefined();
    expect(observers.paint).toBeDefined();
    expect(observers.measure).toBeDefined();

    const [layoutObserver, paintObserver, measureObserver] = instances;
    expect(layoutObserver.observe).toHaveBeenCalledWith({ entryTypes: ['layout-shift'] });
    expect(paintObserver.observe).toHaveBeenCalledWith({ entryTypes: ['paint'] });
    expect(measureObserver.observe).toHaveBeenCalledWith({ entryTypes: ['measure'] });

    layoutObserver.emit([
      {
        entryType: 'layout-shift',
        value: 0.2,
        hadRecentInput: false,
        sources: ['dom-node'],
      } as unknown as PerformanceEntry,
      {
        entryType: 'layout-shift',
        value: 0.3,
        hadRecentInput: true,
        sources: [],
      } as unknown as PerformanceEntry,
    ]);

    expect(metrics.layoutShifts).toBe(0.2);
    expect(performanceLoggerMock.warn).toHaveBeenCalledTimes(1);

    paintObserver.emit([
      {
        entryType: 'paint',
        name: 'first-contentful-paint',
        startTime: 42,
      } as unknown as PerformanceEntry,
    ]);

    expect(metrics.renderTime).toBe(42);
    expect(addToBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'paint',
        name: 'first-contentful-paint',
        startTime: 42,
      })
    );

    measureObserver.emit([
      {
        entryType: 'measure',
        name: 'chain-editor-open',
        duration: 18,
      } as unknown as PerformanceEntry,
      {
        entryType: 'measure',
        name: 'other-measure',
        duration: 3,
      } as unknown as PerformanceEntry,
    ]);

    expect(addToBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'measure',
        name: 'chain-editor-open',
        duration: 18,
      })
    );
    expect(performanceLoggerMock.debug).toHaveBeenCalled();
  });

  it('uses background buffering and handles observer setup failures', () => {
    const metrics = createMetrics();
    const addToBuffer = vi.fn();

    MockPerformanceObserver.throwOnObserveFor = ['paint'];
    const observers = createPerformanceObservers({
      isMonitoring: true,
      backgroundMode: true,
      metrics,
      addToBuffer,
      runWhenIdle: (cb: () => void) => cb(),
    });

    const layoutObserver = instances[0];
    layoutObserver.emit([
      {
        entryType: 'layout-shift',
        value: 0.25,
        hadRecentInput: false,
        sources: [],
      } as unknown as PerformanceEntry,
    ]);

    expect(observers.layout).toBeDefined();
    expect(addToBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'layout-shift',
        value: 0.25,
      })
    );
    expect(performanceLoggerMock.warn).not.toHaveBeenCalled();

    instances.length = 0;
    MockPerformanceObserver.throwOnObserveFor = ['layout-shift'];
    createPerformanceObservers({
      isMonitoring: true,
      backgroundMode: false,
      metrics: createMetrics(),
      addToBuffer: vi.fn(),
      runWhenIdle: (cb: () => void) => cb(),
    });

    expect(performanceLoggerMock.warn).toHaveBeenCalled();
  });

  it('logs paint/measure setup failures in foreground mode', () => {
    MockPerformanceObserver.throwOnObserveFor = ['paint', 'measure'];

    createPerformanceObservers({
      isMonitoring: true,
      backgroundMode: false,
      metrics: createMetrics(),
      addToBuffer: vi.fn(),
      runWhenIdle: (cb: () => void) => cb(),
    });

    expect(performanceLoggerMock.warn).toHaveBeenCalledTimes(2);
    const [paintWarn, measureWarn] = performanceLoggerMock.warn.mock.calls;
    expect(paintWarn?.[0]).toEqual(expect.any(String));
    expect((paintWarn?.[1] as Error).message).toContain('unsupported: paint');
    expect(measureWarn?.[0]).toEqual(expect.any(String));
    expect((measureWarn?.[1] as Error).message).toContain('unsupported: measure');
  });

  it('does not warn for small layout shift values in foreground mode', () => {
    const metrics = createMetrics();
    const addToBuffer = vi.fn();

    createPerformanceObservers({
      isMonitoring: true,
      backgroundMode: false,
      metrics,
      addToBuffer,
      runWhenIdle: (cb: () => void) => cb(),
    });

    const [layoutObserver] = instances;
    layoutObserver.emit([
      {
        entryType: 'layout-shift',
        value: 0.05,
        hadRecentInput: false,
        sources: [],
      } as unknown as PerformanceEntry,
    ]);

    expect(metrics.layoutShifts).toBe(0.05);
    expect(addToBuffer).not.toHaveBeenCalled();
    expect(performanceLoggerMock.warn).not.toHaveBeenCalled();
  });

  it('suppresses setup warnings in background mode when observers fail to initialize', () => {
    MockPerformanceObserver.throwOnObserveFor = ['layout-shift', 'measure'];

    createPerformanceObservers({
      isMonitoring: true,
      backgroundMode: true,
      metrics: createMetrics(),
      addToBuffer: vi.fn(),
      runWhenIdle: (cb: () => void) => cb(),
    });

    expect(performanceLoggerMock.warn).not.toHaveBeenCalled();
  });

  it('ignores non-target paint and measure entries', () => {
    const metrics = createMetrics();
    const addToBuffer = vi.fn();

    createPerformanceObservers({
      isMonitoring: true,
      backgroundMode: false,
      metrics,
      addToBuffer,
      runWhenIdle: (cb: () => void) => cb(),
    });

    const [, paintObserver, measureObserver] = instances;

    paintObserver.emit([
      {
        entryType: 'paint',
        name: 'first-paint',
        startTime: 10,
      } as unknown as PerformanceEntry,
    ]);
    measureObserver.emit([
      {
        entryType: 'measure',
        name: 'unrelated-measure',
        duration: 2,
      } as unknown as PerformanceEntry,
    ]);

    expect(metrics.renderTime).toBe(0);
    expect(addToBuffer).not.toHaveBeenCalled();
    expect(performanceLoggerMock.debug).not.toHaveBeenCalled();
  });
});
