import { describe, expect, it, vi } from 'vitest';
import { checkPerformance, reportMetrics } from '../reporting';
import type { PerformanceMetrics } from '../types';

const performanceLoggerMock = vi.hoisted(() => ({
  group: vi.fn((_label: string, fn: () => void) => fn()),
  log: vi.fn(),
}));

vi.mock('../../performanceLogger', () => ({
  performanceLogger: performanceLoggerMock,
}));

function createMetrics(): PerformanceMetrics {
  return {
    renderTime: 10,
    interactionTime: 20,
    layoutShifts: 0.01,
    fps: 60,
  };
}

describe('performance-monitor/reporting', () => {
  it('reports metrics and includes memory usage when available', () => {
    Object.defineProperty(performance, 'memory', {
      value: { usedJSHeapSize: 20 * 1024 * 1024 },
      configurable: true,
      writable: true,
    });

    const metrics = createMetrics();
    const reported = reportMetrics(metrics);

    expect(reported).toEqual(expect.objectContaining({ memoryUsage: 20 }));
    expect(reported).not.toBe(metrics);
    expect(metrics.memoryUsage).toBe(20);
    expect(performanceLoggerMock.group).toHaveBeenCalledTimes(1);
    expect(performanceLoggerMock.log).toHaveBeenCalled();
  });

  it('reports metrics without memory usage when memory API is unavailable', () => {
    Object.defineProperty(performance, 'memory', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const metrics = createMetrics();
    const reported = reportMetrics(metrics);

    expect(reported.memoryUsage).toBeUndefined();
    expect(metrics.memoryUsage).toBeUndefined();
  });

  it('passes performance checks when all indicators are within thresholds', () => {
    const result = checkPerformance({
      renderTime: 10,
      interactionTime: 50,
      layoutShifts: 0.05,
      fps: 45,
      memoryUsage: 40,
    });

    expect(result).toEqual({
      passed: true,
      issues: [],
    });
  });

  it('returns all expected issues when thresholds are exceeded', () => {
    const result = checkPerformance({
      renderTime: 10,
      interactionTime: 150,
      layoutShifts: 0.2,
      fps: 24,
      memoryUsage: 75,
    });

    expect(result.passed).toBe(false);
    expect(result.issues).toHaveLength(4);
    const joined = result.issues.join(' | ');
    expect(joined).toContain('150.00ms');
    expect(joined).toContain('0.2000');
    expect(joined).toContain('FPS');
    expect(joined).toContain('75.00MB');
  });
});
