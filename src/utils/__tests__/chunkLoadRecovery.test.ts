import { describe, expect, it, vi } from 'vitest';
import {
  attemptChunkLoadRecovery,
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
});
