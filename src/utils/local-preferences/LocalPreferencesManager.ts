import type { CanvasState, Language, Theme, TimerPersistData } from './types';
import { LOCAL_STORAGE_KEYS } from './keys';
import { clearAutoResume, getAutoResume, setAutoResume } from './autoResume';
import {
  clearCanvasState,
  getCanvasState,
  setCanvasState,
} from './canvasState';
import {
  clearExceptionRulesMigration,
  getExceptionRules,
  getExceptionRulesMigration,
  getExceptionRulesUsage,
  setExceptionRules,
  setExceptionRulesMigration,
  setExceptionRulesUsage,
} from './exceptionRulesCache';
import { getLanguage, setLanguage } from './language';
import {
  getNotificationsEnabled,
  setNotificationsEnabled,
} from './notifications';
import { getAllKeys, getRaw, remove, setRaw } from './raw';
import { getTaskTimeStats, setTaskTimeStats } from './taskTimeStatsCache';
import { getTheme, setTheme } from './theme';
import {
  cleanupExpiredTimers,
  clearTimerState,
  getAllTimerKeys,
  getTimerState,
  setTimerState,
} from './timerState';

class LocalPreferencesManager {
  // ==================== Theme ====================

  getTheme(): Theme | null {
    return getTheme();
  }

  setTheme(theme: Theme): void {
    setTheme(theme);
  }

  // ==================== Language ====================

  getLanguage(): Language | null {
    return getLanguage();
  }

  setLanguage(language: Language): void {
    setLanguage(language);
  }

  // ==================== Notifications ====================

  getNotificationsEnabled(): boolean | null {
    return getNotificationsEnabled();
  }

  setNotificationsEnabled(enabled: boolean): void {
    setNotificationsEnabled(enabled);
  }

  // ==================== Storage Mode ====================

  getStorageMode(): 'local' | 'supabase' | null {
    const stored = getRaw(LOCAL_STORAGE_KEYS.STORAGE_MODE);
    if (stored === 'local' || stored === 'supabase') {
      return stored;
    }
    return null;
  }

  setStorageMode(mode: 'local' | 'supabase'): void {
    setRaw(LOCAL_STORAGE_KEYS.STORAGE_MODE, mode);
  }

  getStorageModeHintDismissed(): boolean {
    return getRaw(LOCAL_STORAGE_KEYS.STORAGE_MODE_HINT_DISMISSED) === 'true';
  }

  setStorageModeHintDismissed(dismissed: boolean): void {
    setRaw(LOCAL_STORAGE_KEYS.STORAGE_MODE_HINT_DISMISSED, String(dismissed));
  }

  // ==================== Canvas State ====================

  getCanvasState(): CanvasState | null {
    return getCanvasState();
  }

  setCanvasState(state: CanvasState): void {
    setCanvasState(state);
  }

  clearCanvasState(): void {
    clearCanvasState();
  }

  // ==================== Auto Resume ====================

  getAutoResume() {
    return getAutoResume();
  }

  setAutoResume(data: Parameters<typeof setAutoResume>[0]): void {
    setAutoResume(data);
  }

  clearAutoResume(): void {
    clearAutoResume();
  }

  // ==================== Forward Timer ====================

  getTimerState(sessionId: string): TimerPersistData | null {
    return getTimerState(sessionId);
  }

  setTimerState(sessionId: string, data: TimerPersistData): void {
    setTimerState(sessionId, data);
  }

  clearTimerState(sessionId: string): void {
    clearTimerState(sessionId);
  }

  getAllTimerKeys(): string[] {
    return getAllTimerKeys();
  }

  cleanupExpiredTimers(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    cleanupExpiredTimers(maxAgeMs);
  }

  // ==================== Exception Rules ====================

  getExceptionRules(): string | null {
    return getExceptionRules();
  }

  setExceptionRules(data: string): void {
    setExceptionRules(data);
  }

  getExceptionRulesUsage(): string | null {
    return getExceptionRulesUsage();
  }

  setExceptionRulesUsage(data: string): void {
    setExceptionRulesUsage(data);
  }

  getExceptionRulesMigration(): string | null {
    return getExceptionRulesMigration();
  }

  setExceptionRulesMigration(data: string): void {
    setExceptionRulesMigration(data);
  }

  clearExceptionRulesMigration(): void {
    clearExceptionRulesMigration();
  }

  // ==================== Task Time Stats ====================

  getTaskTimeStats(): string | null {
    return getTaskTimeStats();
  }

  setTaskTimeStats(data: string): void {
    setTaskTimeStats(data);
  }

  // ==================== Generic Operations ====================

  getRaw(key: string): string | null {
    return getRaw(key);
  }

  setRaw(key: string, value: string): void {
    setRaw(key, value);
  }

  remove(key: string): void {
    remove(key);
  }

  getAllKeys(): string[] {
    return getAllKeys();
  }
}

export const localPreferences = new LocalPreferencesManager();
