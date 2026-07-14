import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  attemptChunkLoadRecovery,
  installChunkLoadRecovery,
  isChunkLoadError,
} from '../chunkLoadRecovery';

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    storage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    },
    data,
  };
}

describe('chunkLoadRecovery', () => {
  afterEach(() => {
    vi.doUnmock('../env');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('matches common dynamic import chunk error messages', () => {
    expect(
      isChunkLoadError(
        new Error('Failed to fetch dynamically imported module: /assets/x.js'),
      ),
    ).toBe(true);
    expect(
      isChunkLoadError(new Error('ChunkLoadError: Loading chunk 17 failed.')),
    ).toBe(true);
    expect(
      isChunkLoadError(new Error('Importing a module script failed.')),
    ).toBe(true);
    expect(isChunkLoadError(new Error('Network timeout'))).toBe(false);
  });

  it('normalizes string and object-shaped rejection reasons', () => {
    expect(isChunkLoadError('Loading chunk 8 failed')).toBe(true);
    expect(
      isChunkLoadError({
        message: 'Failed to fetch dynamically imported module: /chunk.js',
      }),
    ).toBe(true);
    expect(isChunkLoadError({ message: 404 })).toBe(false);
    expect(isChunkLoadError({ reason: 'Loading chunk 8 failed' })).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it('reloads once and honors cooldown to avoid loops', () => {
    const reload = vi.fn();
    const { storage } = createMemoryStorage();

    expect(
      attemptChunkLoadRecovery(new Error('Loading chunk 7 failed'), {
        force: true,
        now: 1_000,
        reload,
        storage,
      }),
    ).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);

    expect(
      attemptChunkLoadRecovery(new Error('Loading chunk 7 failed'), {
        force: true,
        now: 20_000,
        reload,
        storage,
      }),
    ).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);

    expect(
      attemptChunkLoadRecovery(new Error('Loading chunk 7 failed'), {
        force: true,
        now: 70_001,
        reload,
        storage,
      }),
    ).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('skips non-chunk errors', () => {
    const reload = vi.fn();
    const { storage, data } = createMemoryStorage();

    expect(
      attemptChunkLoadRecovery(new Error('Some unrelated runtime error'), {
        force: true,
        now: 1_000,
        reload,
        storage,
      }),
    ).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(data.size).toBe(0);
  });

  it('honors an explicit disable and the non-production default', () => {
    const reload = vi.fn();

    expect(
      attemptChunkLoadRecovery('Loading chunk 7 failed', {
        force: false,
        reload,
      }),
    ).toBe(false);
    expect(attemptChunkLoadRecovery('Loading chunk 7 failed')).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('treats invalid and unreadable cooldown values as recoverable', () => {
    const invalidSetItem = vi.fn();
    const invalidStorage = {
      getItem: vi.fn(() => 'not-a-timestamp'),
      setItem: invalidSetItem,
    };
    const unreadableSetItem = vi.fn();
    const unreadableStorage = {
      getItem: vi.fn(() => {
        throw new Error('storage blocked');
      }),
      setItem: unreadableSetItem,
    };
    const reload = vi.fn();

    expect(
      attemptChunkLoadRecovery('Loading chunk 4 failed', {
        force: true,
        now: 5_000,
        reload,
        storage: invalidStorage,
      }),
    ).toBe(true);
    expect(invalidSetItem).toHaveBeenCalledWith(
      'momentum:chunk-reload-at',
      '5000',
    );

    expect(
      attemptChunkLoadRecovery('Loading chunk 5 failed', {
        force: true,
        now: 6_000,
        reload,
        storage: unreadableStorage,
      }),
    ).toBe(true);
    expect(unreadableSetItem).toHaveBeenCalledWith(
      'momentum:chunk-reload-at',
      '6000',
    );
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('still reloads when persisting the cooldown marker fails', () => {
    const reload = vi.fn();
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error('quota exceeded');
      }),
    };

    expect(
      attemptChunkLoadRecovery('Loading chunk 6 failed', {
        force: true,
        now: 7_000,
        reload,
        storage,
      }),
    ).toBe(true);
    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('uses the default clock, session storage, and page reload boundary', () => {
    const reload = vi.fn();
    const { storage, data } = createMemoryStorage();
    vi.spyOn(Date, 'now').mockReturnValue(8_000);
    vi.stubGlobal('window', {
      sessionStorage: storage,
      location: { reload },
    });

    expect(
      attemptChunkLoadRecovery('Loading chunk 9 failed', { force: true }),
    ).toBe(true);
    expect(data.get('momentum:chunk-reload-at')).toBe('8000');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('recovers without persistence when window storage is unavailable', () => {
    const reloadWithoutWindow = vi.fn();
    vi.stubGlobal('window', undefined);

    expect(
      attemptChunkLoadRecovery('Loading chunk 10 failed', {
        force: true,
        now: 9_000,
        reload: reloadWithoutWindow,
      }),
    ).toBe(true);
    expect(reloadWithoutWindow).toHaveBeenCalledOnce();

    const cleanup = installChunkLoadRecovery();
    expect(cleanup).toBeTypeOf('function');
    expect(() => cleanup()).not.toThrow();
  });

  it('recovers when accessing the default session storage throws', () => {
    const reload = vi.fn();
    const fakeWindow = Object.defineProperty(
      { location: { reload } },
      'sessionStorage',
      {
        get() {
          throw new Error('security error');
        },
      },
    );
    vi.stubGlobal('window', fakeWindow);

    expect(
      attemptChunkLoadRecovery('Loading chunk 11 failed', {
        force: true,
        now: 10_000,
      }),
    ).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('installs production error listeners and removes them during cleanup', async () => {
    vi.resetModules();
    vi.doMock('../env', () => ({ isDev: false, isProd: true }));

    const reload = vi.fn();
    const { storage, data } = createMemoryStorage();
    const fakeWindow = Object.assign(new EventTarget(), {
      sessionStorage: storage,
      location: { reload },
    });
    vi.stubGlobal('window', fakeWindow);
    const { installChunkLoadRecovery: installProductionRecovery } =
      await import('../chunkLoadRecovery');
    const cleanup = installProductionRecovery();

    const unrelatedError = new ErrorEvent('error', {
      cancelable: true,
      error: new Error('network timeout'),
    });
    fakeWindow.dispatchEvent(unrelatedError);
    expect(unrelatedError.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();

    const chunkError = new ErrorEvent('error', {
      cancelable: true,
      error: new Error('Loading chunk 12 failed'),
    });
    fakeWindow.dispatchEvent(chunkError);
    expect(chunkError.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledOnce();

    data.clear();
    const unrelatedRejection = new Event('unhandledrejection', {
      cancelable: true,
    }) as PromiseRejectionEvent;
    Object.defineProperty(unrelatedRejection, 'reason', {
      value: new Error('offline'),
    });
    fakeWindow.dispatchEvent(unrelatedRejection);
    expect(unrelatedRejection.defaultPrevented).toBe(false);
    expect(reload).toHaveBeenCalledOnce();

    const chunkRejection = new Event('unhandledrejection', {
      cancelable: true,
    }) as PromiseRejectionEvent;
    Object.defineProperty(chunkRejection, 'reason', {
      value: new Error('Importing a module script failed.'),
    });
    fakeWindow.dispatchEvent(chunkRejection);
    expect(chunkRejection.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);

    data.clear();
    const messageOnlyError = new ErrorEvent('error', {
      cancelable: true,
      error: null,
      message: 'Failed to fetch dynamically imported module: /lazy.js',
    });
    fakeWindow.dispatchEvent(messageOnlyError);
    expect(messageOnlyError.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(3);

    cleanup();
    data.clear();
    const afterCleanup = new ErrorEvent('error', {
      cancelable: true,
      error: new Error('Loading chunk 13 failed'),
    });
    fakeWindow.dispatchEvent(afterCleanup);
    expect(afterCleanup.defaultPrevented).toBe(false);
    expect(reload).toHaveBeenCalledTimes(3);
  });
});
