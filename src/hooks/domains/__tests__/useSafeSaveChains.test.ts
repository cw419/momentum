import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLocalStorageMock,
  createUnitChain,
} from '../../../test/factories';
import { realTimeSyncService } from '../../../services/RealTimeSyncService';
import { useSafeSaveChains } from '../useSafeSaveChains';

vi.mock('../../../utils/env', () => ({
  isDev: false,
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../services/RealTimeSyncService', () => ({
  realTimeSyncService: {
    saveWithSync: vi.fn(),
    clearAllCaches: vi.fn(async () => undefined),
  },
}));

describe('useSafeSaveChains', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should persist active and deleted chains together', async () => {
    const activeChain = createUnitChain({ id: 'active-1' });
    const deletedChain = createUnitChain({ id: 'deleted-1', deletedAt: new Date('2026-02-01T10:00:00.000Z') });
    const storage = createLocalStorageMock({
      getChains: vi.fn(async () => [activeChain, deletedChain]),
    });
    vi.mocked(realTimeSyncService.saveWithSync).mockResolvedValue([activeChain]);

    const { result } = renderHook(() => useSafeSaveChains(storage));

    await result.current([activeChain]);

    expect(realTimeSyncService.saveWithSync).toHaveBeenCalledWith(storage, [activeChain, deletedChain]);
  });

  it('should fail immediately on non-retryable client errors', async () => {
    const chain = createUnitChain({ id: 'chain-2' });
    const storage = createLocalStorageMock({
      getChains: vi.fn(async () => [chain]),
    });
    vi.mocked(realTimeSyncService.saveWithSync).mockRejectedValue(
      new Error('Converting circular structure to JSON')
    );

    const { result } = renderHook(() => useSafeSaveChains(storage));

    await expect(result.current([chain])).rejects.toThrow('Converting circular structure to JSON');
    expect(realTimeSyncService.clearAllCaches).not.toHaveBeenCalled();
  });

  it('should retry retryable failures with exponential backoff', async () => {
    vi.useFakeTimers();
    const chain = createUnitChain({ id: 'chain-3' });
    const storage = createLocalStorageMock({
      getChains: vi.fn(async () => [chain]),
    });
    vi.mocked(realTimeSyncService.saveWithSync)
      .mockRejectedValueOnce(new Error('temporary network issue'))
      .mockResolvedValueOnce([chain]);

    const { result } = renderHook(() => useSafeSaveChains(storage));

    const savePromise = result.current([chain]);
    await vi.advanceTimersByTimeAsync(1000);
    await savePromise;

    expect(realTimeSyncService.saveWithSync).toHaveBeenCalledTimes(2);
    expect(realTimeSyncService.clearAllCaches).toHaveBeenCalledWith(storage);
  });

  it('should throw when retries exceed max attempts', async () => {
    vi.useFakeTimers();
    const chain = createUnitChain({ id: 'chain-4' });
    const storage = createLocalStorageMock({
      getChains: vi.fn(async () => [chain]),
    });
    vi.mocked(realTimeSyncService.saveWithSync).mockRejectedValue(new Error('persistent failure'));

    const { result } = renderHook(() => useSafeSaveChains(storage));

    const savePromise = result.current([chain]);
    const rejection = expect(savePromise).rejects.toThrow('persistent failure');
    await vi.advanceTimersByTimeAsync(7000);
    await rejection;
    expect(realTimeSyncService.saveWithSync).toHaveBeenCalledTimes(4);
  });
});
