/**
 * 性能监控工具
 * 监控ChainEditor的渲染性能和交互响应时间
 */

import { isDev } from '../env';
import { performanceLogger } from '../performanceLogger';
import { addToBuffer, processBatchData } from './buffer';
import { runWhenIdle } from './idle';
import { startFpsMonitoring } from './fps';
import { measureInteraction, measureRender } from './measures';
import { createPerformanceObservers } from './observers';
import { checkPerformance, reportMetrics } from './reporting';
import type {
  FpsCounter,
  PerformanceBufferEntry,
  PerformanceMetrics,
  PerformanceObservers,
} from './types';

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    renderTime: 0,
    interactionTime: 0,
    layoutShifts: 0,
    fps: 0,
  };

  private observers: PerformanceObservers = {};

  private fpsCounter: FpsCounter = {
    frames: 0,
    lastTime: 0,
    fps: 0,
    lastWarnTime: 0,
  };

  private isMonitoring = false;
  private backgroundMode = true;
  private dataBuffer: PerformanceBufferEntry[] = [];
  private maxBufferSize = 100;
  private reportingEnabled = isDev;
  private initialized = false;
  private batchInterval: ReturnType<typeof setInterval> | null = null;

  private initializeObservers() {
    this.observers = createPerformanceObservers({
      isMonitoring: this.isMonitoring,
      backgroundMode: this.backgroundMode,
      metrics: this.metrics,
      addToBuffer: (entry) => this.addToBuffer(entry),
      runWhenIdle,
    });
  }

  private addToBuffer(data: PerformanceBufferEntry) {
    addToBuffer(this.dataBuffer, this.maxBufferSize, data);
  }

  private async processBatchData() {
    return processBatchData({
      buffer: this.dataBuffer,
      reportingEnabled: this.reportingEnabled,
      backgroundMode: this.backgroundMode,
    });
  }

  setBackgroundMode(enabled: boolean) {
    this.backgroundMode = enabled;
  }

  setReportingEnabled(enabled: boolean) {
    this.reportingEnabled = enabled;
  }

  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    startFpsMonitoring({
      metrics: this.metrics,
      fpsCounter: this.fpsCounter,
      getIsMonitoring: () => this.isMonitoring,
      isDev,
    });

    if (!this.initialized && this.reportingEnabled) {
      this.initialized = true;
      runWhenIdle(() => this.initializeObservers(), 1000);
    }

    if (this.backgroundMode) {
      this.batchInterval = setInterval(() => {
        this.processBatchData();
      }, 5000);
    }

    if (this.reportingEnabled && !this.backgroundMode) {
      performanceLogger.debug('🔍 性能监控已启动');
    }
  }

  stopMonitoring() {
    this.isMonitoring = false;

    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }

    Object.values(this.observers).forEach((observer) => {
      observer?.disconnect();
    });

    if (isDev) {
      performanceLogger.debug('⏹️ 性能监控已停止');
      this.reportMetrics();
    }
  }

  start(): void {
    this.startMonitoring();
  }

  stop(): void {
    this.stopMonitoring();
  }

  measureRender<T>(componentName: string, renderFn: () => T): T {
    return measureRender({
      reportingEnabled: this.reportingEnabled,
      componentName,
      renderFn,
    });
  }

  measureInteraction<T>(interactionName: string, interactionFn: () => T): T {
    return measureInteraction({
      reportingEnabled: this.reportingEnabled,
      backgroundMode: this.backgroundMode,
      metrics: this.metrics,
      interactionName,
      interactionFn,
      addToBuffer: (entry) => this.addToBuffer(entry),
    });
  }

  reportMetrics() {
    return reportMetrics(this.metrics);
  }

  checkPerformance(): { passed: boolean; issues: string[] } {
    return checkPerformance(this.metrics);
  }
}

export const performanceMonitor = new PerformanceMonitor();
