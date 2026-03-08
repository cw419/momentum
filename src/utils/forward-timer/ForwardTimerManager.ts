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
          this.timers.forEach((timer) => {
            if (!timer.isPaused) {
              timer.lastVisibilityChange = now;
            }
          });
        } else {
          this.timers.forEach((timer) => {
            if (!timer.isPaused && timer.lastVisibilityChange) {
              timer.lastVisibilityChange = undefined;
            }
          });
        }
      };

      document.addEventListener('visibilitychange', this.visibilityHandler);

      this.focusHandler = () => {};
      this.blurHandler = () => {};

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
      const existingTimer = this.timers.get(sessionId)!;
      existingTimer.startTime = now;
      existingTimer.pausedTime = 0;
      existingTimer.totalPausedDuration = 0;
      existingTimer.isPaused = false;
      existingTimer.lastVisibilityChange = undefined;
    } else {
      this.timers.set(sessionId, {
        startTime: now,
        pausedTime: 0,
        totalPausedDuration: 0,
        isPaused: false,
      });
    }

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

    const adjustedElapsed = elapsedTime - timer.totalPausedDuration;
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
