import { describe, expect, it, vi } from 'vitest';
import { startFpsMonitoring } from '../fps';
import { performanceLogger } from '../../performanceLogger';
import type { FpsCounter, PerformanceMetrics } from '../types';

describe('performance-monitor/fps', () => {
  it('stops monitoring loop when monitoring flag is false', () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    const rafSpy = vi.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    vi.stubGlobal('requestAnimationFrame', rafSpy);

    const metrics: PerformanceMetrics = {
      renderTime: 0,
      interactionTime: 0,
      layoutShifts: 0,
      fps: 0,
    };
    const fpsCounter: FpsCounter = {
      frames: 0,
      lastTime: 0,
      fps: 0,
      lastWarnTime: 0,
    };

    startFpsMonitoring({
      metrics,
      fpsCounter,
      getIsMonitoring: () => false,
      isDev: false,
    });

    expect(rafSpy).toHaveBeenCalledTimes(1);
    rafCallbacks[0](100);
    expect(rafSpy).toHaveBeenCalledTimes(1);
  });

  it('updates FPS and throttles low-fps warnings in production mode', () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      })
    );

    const warnSpy = vi.spyOn(performanceLogger, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Date, 'now').mockReturnValueOnce(40_000).mockReturnValueOnce(45_000);

    const metrics: PerformanceMetrics = {
      renderTime: 0,
      interactionTime: 0,
      layoutShifts: 0,
      fps: 0,
    };
    const fpsCounter: FpsCounter = {
      frames: 0,
      lastTime: 0,
      fps: 0,
      lastWarnTime: 0,
    };

    startFpsMonitoring({
      metrics,
      fpsCounter,
      getIsMonitoring: () => true,
      isDev: false,
    });

    rafCallbacks[0](500);
    rafCallbacks[1](1500);
    rafCallbacks[2](2600);

    expect(metrics.fps).toBe(1);
    expect(fpsCounter.lastWarnTime).toBe(40_000);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('does not warn for low fps in development mode', () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      })
    );

    const warnSpy = vi.spyOn(performanceLogger, 'warn').mockImplementation(() => undefined);

    const metrics: PerformanceMetrics = {
      renderTime: 0,
      interactionTime: 0,
      layoutShifts: 0,
      fps: 0,
    };
    const fpsCounter: FpsCounter = {
      frames: 0,
      lastTime: 0,
      fps: 0,
      lastWarnTime: 0,
    };

    startFpsMonitoring({
      metrics,
      fpsCounter,
      getIsMonitoring: () => true,
      isDev: true,
    });

    rafCallbacks[0](1000);
    rafCallbacks[1](2000);

    expect(metrics.fps).toBe(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
