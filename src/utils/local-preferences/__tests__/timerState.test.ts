import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCAL_STORAGE_KEYS } from '../keys';

const loggerMock = vi.hoisted(() => ({
  warn: vi.fn(),
}));

vi.mock('../../logger', () => ({
  logger: loggerMock,
}));

import {
  cleanupExpiredTimers,
  clearTimerState,
  getAllTimerKeys,
  getTimerState,
  setTimerState,
} from '../timerState';

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  key?: (index: number) => string | null;
  length?: number;
};

function replaceLocalStorage(value: unknown) {
  Object.defineProperty(window, 'localStorage', {
    value,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value,
    configurable: true,
    writable: true,
  });
}

function createEnumerableStorage(initial: Record<string, string>): StorageLike {
  let store = { ...initial };
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe('local-preferences/timerState', () => {
  beforeEach(() => {
    localStorage.clear();
    loggerMock.warn.mockReset();
  });

  it('gets, sets and clears timer state by session id', () => {
    const sessionId = 'session-1';
    const payload = {
      sessionId,
      startTime: 1000,
      pausedTime: 0,
      totalPausedDuration: 0,
      isPaused: false,
      timestamp: 1000,
    };

    expect(getTimerState(sessionId)).toBeNull();
    setTimerState(sessionId, payload);
    expect(getTimerState(sessionId)).toEqual(payload);

    clearTimerState(sessionId);
    expect(getTimerState(sessionId)).toBeNull();
  });

  it('returns safe fallbacks and logs warnings when storage operations throw', () => {
    const getItemSpy = vi
      .spyOn(window.localStorage, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked get');
      });
    const setItemSpy = vi
      .spyOn(window.localStorage, 'setItem')
      .mockImplementation(() => {
        throw new Error('blocked set');
      });
    const removeItemSpy = vi
      .spyOn(window.localStorage, 'removeItem')
      .mockImplementation(() => {
        throw new Error('blocked remove');
      });

    expect(getTimerState('session-2')).toBeNull();
    expect(() =>
      setTimerState('session-2', {
        sessionId: 'session-2',
        startTime: 1,
        pausedTime: 0,
        totalPausedDuration: 0,
        isPaused: false,
        timestamp: 1,
      }),
    ).not.toThrow();
    expect(() => clearTimerState('session-2')).not.toThrow();

    expect(loggerMock.warn).toHaveBeenCalledTimes(2);
    expect(loggerMock.warn.mock.calls[0]).toEqual([
      'LOCAL_PREFERENCES',
      'Failed to persist timer state',
      { sessionId: 'session-2' },
      expect.any(Error),
    ]);
    expect(loggerMock.warn.mock.calls[1]).toEqual([
      'LOCAL_PREFERENCES',
      'Failed to remove timer state',
      { sessionId: 'session-2' },
      expect.any(Error),
    ]);

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
  });

  it('collects timer keys via standard storage API and object fallback', () => {
    const originalLocalStorage = globalThis.localStorage;
    try {
      replaceLocalStorage(
        createEnumerableStorage({
          [`${LOCAL_STORAGE_KEYS.TIMER_PREFIX}session-3`]: 'value-1',
          other_key: 'value-2',
        }),
      );
      expect(getAllTimerKeys()).toEqual([
        `${LOCAL_STORAGE_KEYS.TIMER_PREFIX}session-3`,
      ]);

      replaceLocalStorage({
        length: 2,
        [`${LOCAL_STORAGE_KEYS.TIMER_PREFIX}a`]: '1',
        [`${LOCAL_STORAGE_KEYS.TIMER_PREFIX}b`]: '2',
        unrelated: '3',
      });
      expect(getAllTimerKeys().sort()).toEqual(
        [
          `${LOCAL_STORAGE_KEYS.TIMER_PREFIX}a`,
          `${LOCAL_STORAGE_KEYS.TIMER_PREFIX}b`,
        ].sort(),
      );
    } finally {
      replaceLocalStorage(originalLocalStorage);
    }
  });

  it('falls back to object-key scanning when length exists but key accessor is missing', () => {
    const originalLocalStorage = globalThis.localStorage;
    try {
      replaceLocalStorage({
        length: 3,
        [`${LOCAL_STORAGE_KEYS.TIMER_PREFIX}x`]: '1',
        [`${LOCAL_STORAGE_KEYS.TIMER_PREFIX}y`]: '2',
        other: '3',
      });

      expect(getAllTimerKeys().sort()).toEqual(
        [
          `${LOCAL_STORAGE_KEYS.TIMER_PREFIX}x`,
          `${LOCAL_STORAGE_KEYS.TIMER_PREFIX}y`,
        ].sort(),
      );
    } finally {
      replaceLocalStorage(originalLocalStorage);
    }
  });

  it('returns [] when collecting timer keys throws', () => {
    const originalLocalStorage = globalThis.localStorage;
    try {
      replaceLocalStorage({
        get length() {
          throw new Error('length failed');
        },
      });

      expect(getAllTimerKeys()).toEqual([]);
    } finally {
      replaceLocalStorage(originalLocalStorage);
    }
  });

  it('cleans up expired or malformed timer entries and logs outer cleanup errors', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const freshKey = `${LOCAL_STORAGE_KEYS.TIMER_PREFIX}fresh`;
    const expiredKey = `${LOCAL_STORAGE_KEYS.TIMER_PREFIX}expired`;
    const malformedKey = `${LOCAL_STORAGE_KEYS.TIMER_PREFIX}bad`;
    const crashKey = `${LOCAL_STORAGE_KEYS.TIMER_PREFIX}crash`;

    const storage = createEnumerableStorage({
      [freshKey]: JSON.stringify({
        sessionId: 'fresh',
        startTime: 1,
        pausedTime: 0,
        totalPausedDuration: 0,
        isPaused: false,
        timestamp: 995_000,
      }),
      [expiredKey]: JSON.stringify({
        sessionId: 'expired',
        startTime: 1,
        pausedTime: 0,
        totalPausedDuration: 0,
        isPaused: false,
        timestamp: 1000,
      }),
      [malformedKey]: '{bad-json',
      [crashKey]: '{bad-json',
    });
    const originalRemoveItem = storage.removeItem.bind(storage);
    storage.removeItem = (key: string) => {
      if (key === crashKey) {
        throw new Error('remove failed');
      }
      originalRemoveItem(key);
    };

    const originalLocalStorage = globalThis.localStorage;
    try {
      replaceLocalStorage(storage);

      cleanupExpiredTimers(10_000);

      expect(storage.getItem(freshKey)).not.toBeNull();
      expect(storage.getItem(expiredKey)).toBeNull();
      expect(loggerMock.warn).toHaveBeenCalledWith(
        'LOCAL_PREFERENCES',
        'Failed to cleanup expired timers',
        undefined,
        expect.any(Error),
      );
    } finally {
      replaceLocalStorage(originalLocalStorage);
      nowSpy.mockRestore();
    }
  });

  it('keeps non-expired boundary timers and empty payload entries', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(2_000_000);
    const maxAge = 10_000;
    const boundaryKey = `${LOCAL_STORAGE_KEYS.TIMER_PREFIX}boundary`;
    const emptyKey = `${LOCAL_STORAGE_KEYS.TIMER_PREFIX}empty`;

    const storage = createEnumerableStorage({
      [boundaryKey]: JSON.stringify({
        sessionId: 'boundary',
        startTime: 1,
        pausedTime: 0,
        totalPausedDuration: 0,
        isPaused: false,
        timestamp: 2_000_000 - maxAge,
      }),
      [emptyKey]: '',
    });

    const originalLocalStorage = globalThis.localStorage;
    try {
      replaceLocalStorage(storage);

      cleanupExpiredTimers(maxAge);

      expect(storage.getItem(boundaryKey)).not.toBeNull();
      expect(storage.getItem(emptyKey)).toBe('');
      expect(loggerMock.warn).not.toHaveBeenCalled();
    } finally {
      replaceLocalStorage(originalLocalStorage);
      nowSpy.mockRestore();
    }
  });
});
