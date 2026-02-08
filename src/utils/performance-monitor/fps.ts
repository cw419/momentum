import { performanceLogger } from '../performanceLogger';
import type { FpsCounter, PerformanceMetrics } from './types';

export function startFpsMonitoring(args: {
  metrics: PerformanceMetrics;
  fpsCounter: FpsCounter;
  getIsMonitoring: () => boolean;
  isDev: boolean;
}): void {
  const { metrics, fpsCounter, getIsMonitoring, isDev } = args;

  const measureFPS = (timestamp: number) => {
    if (!getIsMonitoring()) return;

    fpsCounter.frames++;

    if (timestamp - fpsCounter.lastTime >= 1000) {
      metrics.fps = Math.round(
        (fpsCounter.frames * 1000) / (timestamp - fpsCounter.lastTime),
      );

      fpsCounter.frames = 0;
      fpsCounter.lastTime = timestamp;

      if (metrics.fps < 30 && !isDev) {
        const now = Date.now();
        if (now - fpsCounter.lastWarnTime > 30000) {
          fpsCounter.lastWarnTime = now;
          performanceLogger.warn('⚠️ FPS较低:', metrics.fps);
        }
      }
    }

    requestAnimationFrame(measureFPS);
  };

  requestAnimationFrame(measureFPS);
}
