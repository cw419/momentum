/**
 * 性能监控工具
 * 监控ChainEditor的渲染性能和交互响应时间
 */

import { isDev } from './env';
import { performanceLogger } from './performanceLogger';

interface PerformanceMetrics {
  renderTime: number;
  interactionTime: number;
  layoutShifts: number;
  memoryUsage?: number;
  fps: number;
}

interface PerformanceBufferEntry {
  type: 'layout-shift' | 'paint' | 'measure' | 'slow-interaction';
  value?: number;
  name?: string;
  startTime?: number;
  duration?: number;
  timestamp: number;
}

function isLayoutShiftEntry(entry: PerformanceEntry): entry is LayoutShift {
  if (entry.entryType !== 'layout-shift') return false;
  const candidate = entry as Partial<LayoutShift>;
  return (
    typeof candidate.value === 'number' &&
    typeof candidate.hadRecentInput === 'boolean' &&
    Array.isArray(candidate.sources)
  );
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    renderTime: 0,
    interactionTime: 0,
    layoutShifts: 0,
    fps: 0
  };

  private observers: {
    layout?: PerformanceObserver;
    paint?: PerformanceObserver;
    measure?: PerformanceObserver;
  } = {};

  private fpsCounter = {
    frames: 0,
    lastTime: 0,
    fps: 0,
    lastWarnTime: 0
  };

  private isMonitoring = false;
  private backgroundMode = true; // 默认后台模式
  private dataBuffer: PerformanceBufferEntry[] = [];
  private maxBufferSize = 100;
  private reportingEnabled = isDev;
  private initialized = false;
  private batchInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {}

  private runWhenIdle(callback: () => void, timeout: number = 1000): void {
    if (typeof window === 'undefined') return;

    const requestIdleCallbackFn = window.requestIdleCallback;
    if (typeof requestIdleCallbackFn === 'function') {
      requestIdleCallbackFn(() => callback(), { timeout });
      return;
    }

    setTimeout(callback, 0);
  }

  private initializeObservers() {
    if (typeof window === 'undefined') return;
    if (!this.isMonitoring) return;
    if (!('PerformanceObserver' in window)) return;

    this.initializeLayoutObserver();
    this.initializePaintObserver();
    this.initializeMeasureObserver();
  }

  private initializeLayoutObserver(): void {
    try {
      this.observers.layout = new PerformanceObserver((list) => {
        // 使用 requestIdleCallback 在空闲时处理数据
        this.runWhenIdle(() => {
          for (const entry of list.getEntries()) {
            if (isLayoutShiftEntry(entry) && !entry.hadRecentInput) {
              this.metrics.layoutShifts += entry.value;
              // 只在后台模式下记录，不立即输出
              if (this.backgroundMode) {
                this.addToBuffer({
                  type: 'layout-shift',
                  value: entry.value,
                  timestamp: Date.now(),
                });
              } else if (entry.value > 0.1) {
                performanceLogger.warn('🚨 检测到大幅布局偏移:', {
                  value: entry.value,
                  sources: entry.sources,
                });
              }
            }
          }
        });
      });

      this.observers.layout.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // 静默处理错误，不影响用户体验
      if (!this.backgroundMode) {
        performanceLogger.warn('布局偏移监控不可用:', e);
      }
    }
  }

  private initializePaintObserver(): void {
    try {
      this.observers.paint = new PerformanceObserver((list) => {
        this.runWhenIdle(() => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.renderTime = entry.startTime;
              this.addToBuffer({
                type: 'paint',
                name: entry.name,
                startTime: entry.startTime,
                timestamp: Date.now(),
              });
            }
          }
        });
      });

      this.observers.paint.observe({ entryTypes: ['paint'] });
    } catch (e) {
      // 静默处理错误
      if (!this.backgroundMode) {
        performanceLogger.warn('绘制性能监控不可用:', e);
      }
    }
  }

  private initializeMeasureObserver(): void {
    try {
      this.observers.measure = new PerformanceObserver((list) => {
        this.runWhenIdle(() => {
          for (const entry of list.getEntries()) {
            if (entry.name.startsWith('chain-editor-')) {
              this.addToBuffer({
                type: 'measure',
                name: entry.name,
                duration: entry.duration,
                timestamp: Date.now(),
              });

              if (!this.backgroundMode) {
                performanceLogger.debug('性能测量:', entry.name, entry.duration + 'ms');
              }
            }
          }
        });
      });

      this.observers.measure.observe({ entryTypes: ['measure'] });
    } catch (e) {
      // 静默处理错误
      if (!this.backgroundMode) {
        performanceLogger.warn('自定义测量监控不可用:', e);
      }
    }
  }

  // 添加数据到缓冲区
  private addToBuffer(data: PerformanceBufferEntry) {
    if (this.dataBuffer.length >= this.maxBufferSize) {
      // 移除最旧的数据
      this.dataBuffer.shift();
    }
    this.dataBuffer.push(data);
  }

  // 异步批量处理数据
  private async processBatchData() {
    if (this.dataBuffer.length === 0) return;

    // 在空闲时处理数据
    return new Promise<void>((resolve) => {
      requestIdleCallback(() => {
        const batchData = [...this.dataBuffer];
        this.dataBuffer = [];
        
        // 处理数据（可以发送到分析服务等）
        if (this.reportingEnabled && !this.backgroundMode) {
          performanceLogger.debug('批量处理性能数据:', batchData.length, '条记录');
        }
        
        resolve();
      });
    });
  }

  // 设置监控模式
  setBackgroundMode(enabled: boolean) {
    this.backgroundMode = enabled;
  }

  // 启用/禁用报告
  setReportingEnabled(enabled: boolean) {
    this.reportingEnabled = enabled;
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.startFPSMonitoring();

    if (!this.initialized && this.reportingEnabled) {
      this.initialized = true;
      this.runWhenIdle(() => this.initializeObservers(), 1000);
    }
    
    // 定期批量处理数据
    if (this.backgroundMode) {
      this.batchInterval = setInterval(() => {
        this.processBatchData();
      }, 5000); // 每5秒处理一次
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
    
    // 清理观察者
    Object.values(this.observers).forEach(observer => {
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

  private startFPSMonitoring() {
    const measureFPS = (timestamp: number) => {
      if (!this.isMonitoring) return;

      this.fpsCounter.frames++;
      
      if (timestamp - this.fpsCounter.lastTime >= 1000) {
        this.metrics.fps = Math.round(
          (this.fpsCounter.frames * 1000) / (timestamp - this.fpsCounter.lastTime)
        );
        
        this.fpsCounter.frames = 0;
        this.fpsCounter.lastTime = timestamp;

        // FPS 警告节流：每 30 秒最多警告一次，且仅在非开发环境
        if (this.metrics.fps < 30 && !isDev) {
          const now = Date.now();
          if (now - this.fpsCounter.lastWarnTime > 30000) {
            this.fpsCounter.lastWarnTime = now;
            performanceLogger.warn('⚠️ FPS较低:', this.metrics.fps);
          }
        }
      }
      
      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  // 测量组件渲染时间（优化版）
  measureRender<T>(componentName: string, renderFn: () => T): T {
    if (!this.reportingEnabled) {
      return renderFn(); // 直接执行，不进行测量
    }

    const startMark = `${componentName}-render-start`;
    const endMark = `${componentName}-render-end`;
    const measureName = `chain-editor-${componentName}-render`;

    performance.mark(startMark);
    const result = renderFn();
    performance.mark(endMark);
    
    try {
      performance.measure(measureName, startMark, endMark);
    } catch {
      // 静默忽略测量错误
    }

    return result;
  }

  // 测量交互响应时间（优化版）
  measureInteraction<T>(interactionName: string, interactionFn: () => T): T {
    const startTime = this.reportingEnabled ? performance.now() : 0;
    const result = interactionFn();
    
    if (this.reportingEnabled) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.metrics.interactionTime = Math.max(this.metrics.interactionTime, duration);
      
      // 只在非后台模式下立即警告
      if (duration > 100 && !this.backgroundMode) {
        performanceLogger.warn('🐌 交互响应较慢:', interactionName, duration + 'ms');
      } else if (duration > 100) {
        // 后台模式下添加到缓冲区
        this.addToBuffer({
          type: 'slow-interaction',
          name: interactionName,
          duration,
          timestamp: Date.now()
        });
      }
    }

    return result;
  }

  // 获取内存使用情况
  getMemoryUsage(): number | undefined {
    const memory = performance.memory;
    if (memory) return memory.usedJSHeapSize / 1024 / 1024; // MB
    return undefined;
  }

  // 报告性能指标
  reportMetrics() {
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage) {
      this.metrics.memoryUsage = memoryUsage;
    }

    performanceLogger.group('📊 ChainEditor 性能报告', () => {
      performanceLogger.log('渲染时间:', this.metrics.renderTime.toFixed(2) + 'ms');
      performanceLogger.log('最大交互时间:', this.metrics.interactionTime.toFixed(2) + 'ms');
      performanceLogger.log('累积布局偏移:', this.metrics.layoutShifts.toFixed(4));
      performanceLogger.log('当前FPS:', this.metrics.fps);
      if (memoryUsage) {
        performanceLogger.log('内存使用:', memoryUsage.toFixed(2) + 'MB');
      }
    });

    return { ...this.metrics };
  }

  // 检查性能是否达标
  checkPerformance(): { passed: boolean; issues: string[] } {
    const issues: string[] = [];

    if (this.metrics.interactionTime > 100) {
      issues.push(`交互响应时间过长: ${this.metrics.interactionTime.toFixed(2)}ms`);
    }

    if (this.metrics.layoutShifts > 0.1) {
      issues.push(`布局偏移过大: ${this.metrics.layoutShifts.toFixed(4)}`);
    }

    if (this.metrics.fps < 30) {
      issues.push(`FPS过低: ${this.metrics.fps}`);
    }

    if (this.metrics.memoryUsage && this.metrics.memoryUsage > 50) {
      issues.push(`内存使用过高: ${this.metrics.memoryUsage.toFixed(2)}MB`);
    }

    return {
      passed: issues.length === 0,
      issues
    };
  }
}

// 单例实例
export const performanceMonitor = new PerformanceMonitor();
