/**
 * 正向计时管理器
 * 用于管理无时长任务的正向计时功能
 */

import { localPreferences, type TimerPersistData } from '../localPreferences';

interface TimerState {
  startTime: number;
  pausedTime: number;
  totalPausedDuration: number;
  isPaused: boolean;
  lastVisibilityChange?: number;
}

export class ForwardTimerManager {
  private timers: Map<string, TimerState> = new Map();
  private visibilityHandler: (() => void) | null = null;
  private focusHandler: (() => void) | null = null;
  private blurHandler: (() => void) | null = null;
  private started = false;

  start(): void {
    if (this.started) return;
    if (typeof window === 'undefined' || typeof document === 'undefined')
      return;

    this.started = true;
    this.setupVisibilityHandler();

    // 页面启动时清理过期数据
    this.cleanupExpiredStates();
  }

  stop(): void {
    this.destroy();
  }

  /**
   * 设置页面可见性变化处理器
   * 用于处理浏览器标签页切换时的计时准确性
   */
  private setupVisibilityHandler(): void {
    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        const now = performance.now();

        if (document.hidden) {
          // 页面隐藏时记录时间戳
          this.timers.forEach((timer) => {
            if (!timer.isPaused) {
              timer.lastVisibilityChange = now;
            }
          });
        } else {
          // 页面恢复可见时处理时间差
          this.timers.forEach((timer) => {
            if (!timer.isPaused && timer.lastVisibilityChange) {
              // 如果隐藏时间超过1秒，则认为是真正的标签页切换
              // 注释掉暂停时间累积，让计时器继续运行
              // if (hiddenDuration > 1000) {
              //   timer.totalPausedDuration += hiddenDuration;
              // }
              timer.lastVisibilityChange = undefined;
            }
          });
        }
      };

      document.addEventListener('visibilitychange', this.visibilityHandler);

      // 添加窗口焦点事件监听，确保最小化窗口时也继续计时
      this.focusHandler = () => {
        // 窗口获得焦点时，不需要特殊处理，让计时器自然继续
      };

      this.blurHandler = () => {
        // 窗口失去焦点时，不暂停计时器，让它继续运行
      };

      window.addEventListener('focus', this.focusHandler);
      window.addEventListener('blur', this.blurHandler);
    }
  }

  /**
   * 开始正向计时
   * @param sessionId 会话ID
   */
  startTimer(sessionId: string): void {
    const now = performance.now();

    if (this.timers.has(sessionId)) {
      // 如果计时器已存在，重置状态
      const existingTimer = this.timers.get(sessionId)!;
      existingTimer.startTime = now;
      existingTimer.pausedTime = 0;
      existingTimer.totalPausedDuration = 0;
      existingTimer.isPaused = false;
      existingTimer.lastVisibilityChange = undefined;
    } else {
      // 创建新的计时器
      this.timers.set(sessionId, {
        startTime: now,
        pausedTime: 0,
        totalPausedDuration: 0,
        isPaused: false,
      });
    }

    // 持久化到localStorage
    this.persistTimerState(sessionId);
  }

  /**
   * 暂停计时
   * @param sessionId 会话ID
   */
  pauseTimer(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (!timer || timer.isPaused) return;

    const now = performance.now();
    timer.pausedTime = now;
    timer.isPaused = true;

    this.persistTimerState(sessionId);
  }

  /**
   * 恢复计时
   * @param sessionId 会话ID
   */
  resumeTimer(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (!timer || !timer.isPaused) return;

    const now = performance.now();
    const pauseDuration = now - timer.pausedTime;
    timer.totalPausedDuration += pauseDuration;
    timer.isPaused = false;
    timer.pausedTime = 0;

    this.persistTimerState(sessionId);
  }

  /**
   * 停止计时并返回总用时
   * @param sessionId 会话ID
   * @returns 总用时（秒）
   */
  stopTimer(sessionId: string): number {
    const timer = this.timers.get(sessionId);
    if (!timer) return 0;

    const totalElapsed = this.getCurrentElapsed(sessionId);

    // 清理计时器和持久化数据
    this.clearTimer(sessionId);

    return totalElapsed;
  }

  /**
   * 获取当前已用时间
   * @param sessionId 会话ID
   * @returns 已用时间（秒）
   */
  getCurrentElapsed(sessionId: string): number {
    const timer = this.timers.get(sessionId);
    if (!timer) return 0;

    const now = performance.now();
    let elapsedTime: number;

    if (timer.isPaused) {
      elapsedTime = timer.pausedTime - timer.startTime;
    } else {
      elapsedTime = now - timer.startTime;
    }

    // 减去暂停时间
    const adjustedElapsed = elapsedTime - timer.totalPausedDuration;

    // 转换为秒并确保不为负数
    return Math.max(0, Math.floor(adjustedElapsed / 1000));
  }

  /**
   * 清理计时器
   * @param sessionId 会话ID
   */
  clearTimer(sessionId: string): void {
    this.timers.delete(sessionId);
    this.removePersistedState(sessionId);
  }

  /**
   * 检查计时器是否存在
   * @param sessionId 会话ID
   * @returns 是否存在
   */
  hasTimer(sessionId: string): boolean {
    return this.timers.has(sessionId);
  }

  /**
   * 检查计时器是否暂停
   * @param sessionId 会话ID
   * @returns 是否暂停
   */
  isPaused(sessionId: string): boolean {
    const timer = this.timers.get(sessionId);
    return timer ? timer.isPaused : false;
  }

  /**
   * 持久化计时器状态到localStorage
   * @param sessionId 会话ID
   */
  private persistTimerState(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (!timer) return;

    const persistData: TimerPersistData = {
      sessionId,
      startTime: timer.startTime,
      pausedTime: timer.pausedTime,
      totalPausedDuration: timer.totalPausedDuration,
      isPaused: timer.isPaused,
      timestamp: Date.now(),
    };

    localPreferences.setTimerState(sessionId, persistData);
  }

  /**
   * 从localStorage恢复计时器状态
   * @param sessionId 会话ID
   * @returns 是否成功恢复
   */
  restoreTimerState(sessionId: string): boolean {
    const data = localPreferences.getTimerState(sessionId);
    if (!data) return false;

    // 检查数据是否过期（超过24小时）
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      localPreferences.clearTimerState(sessionId);
      return false;
    }

    this.timers.set(sessionId, {
      startTime: data.startTime,
      pausedTime: data.pausedTime,
      totalPausedDuration: data.totalPausedDuration,
      isPaused: data.isPaused,
    });

    return true;
  }

  /**
   * 移除持久化状态
   * @param sessionId 会话ID
   */
  private removePersistedState(sessionId: string): void {
    localPreferences.clearTimerState(sessionId);
  }

  /**
   * 清理所有过期的持久化数据
   */
  cleanupExpiredStates(): void {
    localPreferences.cleanupExpiredTimers();
  }

  /**
   * 销毁管理器，清理事件监听器
   */
  destroy(): void {
    this.started = false;
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.focusHandler && typeof window !== 'undefined') {
      window.removeEventListener('focus', this.focusHandler);
      this.focusHandler = null;
    }

    if (this.blurHandler && typeof window !== 'undefined') {
      window.removeEventListener('blur', this.blurHandler);
      this.blurHandler = null;
    }

    this.timers.clear();
  }
}
