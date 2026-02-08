export interface PerformanceMetrics {
  renderTime: number;
  interactionTime: number;
  layoutShifts: number;
  memoryUsage?: number;
  fps: number;
}

export interface PerformanceBufferEntry {
  type: 'layout-shift' | 'paint' | 'measure' | 'slow-interaction';
  value?: number;
  name?: string;
  startTime?: number;
  duration?: number;
  timestamp: number;
}

export type PerformanceObservers = {
  layout?: PerformanceObserver;
  paint?: PerformanceObserver;
  measure?: PerformanceObserver;
};

export type FpsCounter = {
  frames: number;
  lastTime: number;
  fps: number;
  lastWarnTime: number;
};
