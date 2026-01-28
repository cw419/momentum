/**
 * Local Preferences Utility
 *
 * Encapsulates all direct localStorage access for UI preferences and ephemeral state.
 * This separates UI preferences from application data (chains, sessions, etc.)
 * which should go through MomentumStorage interface.
 *
 * Categories of data handled:
 * 1. UI Preferences (theme, language, notifications)
 * 2. Ephemeral UI State (canvas position, auto-resume timers)
 * 3. Service-specific caches (forward timer state, migration info)
 */

import { logger } from './logger';

// Storage keys - centralized for easy management
const LOCAL_STORAGE_KEYS = {
  // UI Preferences
  THEME: 'theme',
  LANGUAGE: 'language',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',

  // Ephemeral UI State
  RSIP_CANVAS_STATE: 'momentum:rsip-canvas-state',
  AUTO_RESUME: 'momentum_auto_resume',

  // Service Caches
  TIMER_PREFIX: 'momentum_timer_',
  EXCEPTION_RULES: 'momentum_exception_rules',
  EXCEPTION_RULES_USAGE: 'momentum_rule_usage_records',
  EXCEPTION_RULES_MIGRATION: 'momentum_exception_rules_migration',
  TASK_TIME_STATS: 'momentum_task_time_stats',
} as const;

type Theme = 'light' | 'dark';
type Language = 'en' | 'zh';

export interface CanvasState {
  scale: number;
  positionX: number;
  positionY: number;
}

interface AutoResumeData {
  chainId: string;
  startedAt: string;
  resumeAt: string;
}

export interface TimerPersistData {
  sessionId: string;
  startTime: number;
  pausedTime: number;
  totalPausedDuration: number;
  isPaused: boolean;
  timestamp: number;
}

/**
 * Local Preferences Manager
 * Provides type-safe access to localStorage with error handling
 */
class LocalPreferencesManager {
  // ==================== Theme ====================

  getTheme(): Theme | null {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.THEME);
      if (stored === 'light' || stored === 'dark') return stored;
      return null;
    } catch {
      return null;
    }
  }

  setTheme(theme: Theme): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, theme);
    } catch {
      // ignore quota errors
    }
  }

  // ==================== Language ====================

  getLanguage(): Language | null {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.LANGUAGE);
      if (stored === 'en' || stored === 'zh') return stored;
      return null;
    } catch {
      return null;
    }
  }

  setLanguage(language: Language): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.LANGUAGE, language);
    } catch {
      // ignore quota errors
    }
  }

  // ==================== Notifications ====================

  getNotificationsEnabled(): boolean | null {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS_ENABLED);
      if (stored === 'true') return true;
      if (stored === 'false') return false;
      return null;
    } catch {
      return null;
    }
  }

  setNotificationsEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS_ENABLED, enabled.toString());
    } catch {
      // ignore quota errors
    }
  }

  // ==================== Canvas State ====================

  getCanvasState(): CanvasState | null {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.RSIP_CANVAS_STATE);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as CanvasState;
      if (
        typeof parsed.scale === 'number' &&
        typeof parsed.positionX === 'number' &&
        typeof parsed.positionY === 'number'
      ) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  setCanvasState(state: CanvasState): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.RSIP_CANVAS_STATE, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }

  clearCanvasState(): void {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.RSIP_CANVAS_STATE);
    } catch {
      // ignore errors
    }
  }

  // ==================== Auto Resume ====================

  getAutoResume(): AutoResumeData | null {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTO_RESUME);
      if (!stored) return null;
      return JSON.parse(stored) as AutoResumeData;
    } catch {
      return null;
    }
  }

  setAutoResume(data: AutoResumeData): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.AUTO_RESUME, JSON.stringify(data));
    } catch {
      // ignore quota errors
    }
  }

  clearAutoResume(): void {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTO_RESUME);
    } catch {
      // ignore errors
    }
  }

  // ==================== Forward Timer ====================

  getTimerState(sessionId: string): TimerPersistData | null {
    try {
      const key = `${LOCAL_STORAGE_KEYS.TIMER_PREFIX}${sessionId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      return JSON.parse(stored) as TimerPersistData;
    } catch {
      return null;
    }
  }

  setTimerState(sessionId: string, data: TimerPersistData): void {
    try {
      const key = `${LOCAL_STORAGE_KEYS.TIMER_PREFIX}${sessionId}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn('LOCAL_PREFERENCES', 'Failed to persist timer state', { sessionId }, err);
    }
  }

  clearTimerState(sessionId: string): void {
    try {
      const key = `${LOCAL_STORAGE_KEYS.TIMER_PREFIX}${sessionId}`;
      localStorage.removeItem(key);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn('LOCAL_PREFERENCES', 'Failed to remove timer state', { sessionId }, err);
    }
  }

  getAllTimerKeys(): string[] {
    try {
      const keys: string[] = [];
      const storage = localStorage as unknown;
      const storageLike = storage as Partial<Storage>;

      if (typeof storageLike.length === 'number' && typeof storageLike.key === 'function') {
        for (let i = 0; i < storageLike.length; i++) {
          const key = storageLike.key(i);
          if (key && key.startsWith(LOCAL_STORAGE_KEYS.TIMER_PREFIX)) {
            keys.push(key);
          }
        }
      } else if (storage && typeof storage === 'object') {
        const allKeys = Object.keys(storage as Record<string, unknown>);
        keys.push(...allKeys.filter(key => key.startsWith(LOCAL_STORAGE_KEYS.TIMER_PREFIX)));
      }

      return keys;
    } catch {
      return [];
    }
  }

  cleanupExpiredTimers(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    try {
      const keys = this.getAllTimerKeys();
      const now = Date.now();

      keys.forEach(key => {
        try {
          const dataStr = localStorage.getItem(key);
          if (dataStr) {
            const data = JSON.parse(dataStr) as TimerPersistData;
            if (now - data.timestamp > maxAgeMs) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn('LOCAL_PREFERENCES', 'Failed to cleanup expired timers', undefined, err);
    }
  }

  // ==================== Exception Rules ====================

  getExceptionRules(): string | null {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.EXCEPTION_RULES);
    } catch {
      return null;
    }
  }

  setExceptionRules(data: string): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.EXCEPTION_RULES, data);
    } catch {
      // ignore quota errors
    }
  }

  getExceptionRulesUsage(): string | null {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.EXCEPTION_RULES_USAGE);
    } catch {
      return null;
    }
  }

  setExceptionRulesUsage(data: string): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.EXCEPTION_RULES_USAGE, data);
    } catch {
      // ignore quota errors
    }
  }

  getExceptionRulesMigration(): string | null {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.EXCEPTION_RULES_MIGRATION);
    } catch {
      return null;
    }
  }

  setExceptionRulesMigration(data: string): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.EXCEPTION_RULES_MIGRATION, data);
    } catch {
      // ignore quota errors
    }
  }

  clearExceptionRulesMigration(): void {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.EXCEPTION_RULES_MIGRATION);
    } catch {
      // ignore errors
    }
  }

  // ==================== Task Time Stats ====================

  getTaskTimeStats(): string | null {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.TASK_TIME_STATS);
    } catch {
      return null;
    }
  }

  setTaskTimeStats(data: string): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.TASK_TIME_STATS, data);
    } catch {
      // ignore quota errors
    }
  }

  // ==================== Generic Operations ====================

  /**
   * Get raw value by key - use sparingly, prefer typed methods above
   */
  getRaw(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Set raw value by key - use sparingly, prefer typed methods above
   */
  setRaw(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore quota errors
    }
  }

  /**
   * Remove value by key
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore errors
    }
  }

  /**
   * Get all keys in localStorage
   */
  getAllKeys(): string[] {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
      return keys;
    } catch {
      return [];
    }
  }
}

// Export singleton instance
export const localPreferences = new LocalPreferencesManager();
