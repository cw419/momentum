import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppState } from '../../../types';
import {
  createAppState,
  createLocalStorageMock,
  createUnitChain,
} from '../../../test/factories';
import { realTimeSyncService } from '../../../services/RealTimeSyncService';
import { logger } from '../../../utils/logger';
import { toast } from '../../../utils/toast';
import { getSafeErrorDetailFromUnknown } from '../../../utils/errorMessage';
import { useRecycleBinDomain } from '../useRecycleBinDomain';

const trMock = vi.fn((zh: string, en: string) => en);

vi.mock('../../../i18n', () => ({
  useI18n: vi.fn(() => ({
    language: 'en',
    tr: trMock,
  })),
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('../../../utils/toast', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('../../../utils/errorMessage', () => ({
  getSafeErrorDetailFromUnknown: vi.fn(() => ''),
}));

vi.mock('../../../services/RealTimeSyncService', () => ({
  realTimeSyncService: {
    deleteWithSync: vi.fn(),
    restoreWithSync: vi.fn(),
    permanentDeleteWithSync: vi.fn(),
  },
}));

function createStateContainer(initial: AppState) {
  let state = initial;
  const setState = vi.fn((update: AppState | ((prev: AppState) => AppState)) => {
    state = typeof update === 'function' ? (update as (prev: AppState) => AppState)(state) : update;
  });
  return {
    getState: () => state,
    setState,
  };
}

describe('useRecycleBinDomain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    trMock.mockClear();
  });

  it('should delete chain, clean session state, and persist session cleanup', async () => {
    const chain = createUnitChain({ id: 'chain-1' });
    const otherChain = createUnitChain({ id: 'chain-2' });
    const stateRef = createStateContainer(
      createAppState({
        chains: [chain, otherChain],
        viewingChainId: chain.id,
        currentView: 'detail',
        activeSession: {
          chainId: chain.id,
          startedAt: new Date(),
          duration: 20,
          isPaused: false,
          totalPausedTime: 0,
        },
        scheduledSessions: [
          {
            chainId: chain.id,
            scheduledAt: new Date(),
            expiresAt: new Date(Date.now() + 10000),
            auxiliarySignal: 'remove',
          },
          {
            chainId: otherChain.id,
            scheduledAt: new Date(),
            expiresAt: new Date(Date.now() + 20000),
            auxiliarySignal: 'keep',
          },
        ],
      })
    );

    const storage = createLocalStorageMock({
      saveScheduledSessions: vi.fn(async () => undefined),
      saveActiveSession: vi.fn(async () => undefined),
    });
    vi.mocked(realTimeSyncService.deleteWithSync).mockResolvedValue([otherChain]);

    const { result } = renderHook(() =>
      useRecycleBinDomain({
        state: stateRef.getState(),
        setState: stateRef.setState,
        storage,
      })
    );

    await act(async () => {
      await result.current.handleDeleteChain(chain.id);
    });

    expect(realTimeSyncService.deleteWithSync).toHaveBeenCalledWith(storage, chain.id);
    expect(storage.saveScheduledSessions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          chainId: otherChain.id,
        }),
      ])
    );
    expect(storage.saveScheduledSessions).toHaveBeenCalledWith([
      expect.objectContaining({ chainId: otherChain.id }),
    ]);
    expect(storage.saveActiveSession).toHaveBeenCalledWith(null);
    expect(stateRef.getState().chains).toEqual([otherChain]);
    expect(stateRef.getState().activeSession).toBeNull();
    expect(stateRef.getState().currentView).toBe('dashboard');
    expect(stateRef.getState().viewingChainId).toBeNull();
    expect(stateRef.getState().scheduledSessions).toEqual([
      expect.objectContaining({ chainId: otherChain.id }),
    ]);
    expect(stateRef.getState().chainsRevision).toBe(1);
  });

  it('should keep active session and current view when deleting a different chain', async () => {
    const deletingChain = createUnitChain({ id: 'delete-chain' });
    const activeChain = createUnitChain({ id: 'active-chain' });
    const stateRef = createStateContainer(
      createAppState({
        chains: [deletingChain, activeChain],
        currentView: 'focus',
        activeSession: {
          chainId: activeChain.id,
          startedAt: new Date(),
          duration: 20,
          isPaused: false,
          totalPausedTime: 0,
        },
        scheduledSessions: [
          {
            chainId: deletingChain.id,
            scheduledAt: new Date(),
            expiresAt: new Date(Date.now() + 10000),
            auxiliarySignal: 'remove',
          },
        ],
      })
    );

    const storage = createLocalStorageMock({
      saveScheduledSessions: vi.fn(async () => undefined),
      saveActiveSession: vi.fn(async () => undefined),
    });
    vi.mocked(realTimeSyncService.deleteWithSync).mockResolvedValue([activeChain]);

    const { result } = renderHook(() =>
      useRecycleBinDomain({
        state: stateRef.getState(),
        setState: stateRef.setState,
        storage,
      })
    );

    await act(async () => {
      await result.current.handleDeleteChain(deletingChain.id);
    });

    expect(stateRef.getState().activeSession?.chainId).toBe(activeChain.id);
    expect(stateRef.getState().currentView).toBe('focus');
    expect(storage.saveActiveSession).not.toHaveBeenCalled();
  });

  it('should keep viewingChainId when deleting another chain', async () => {
    const deletingChain = createUnitChain({ id: 'delete-chain-view' });
    const viewingChain = createUnitChain({ id: 'view-chain' });
    const stateRef = createStateContainer(
      createAppState({
        chains: [deletingChain, viewingChain],
        viewingChainId: viewingChain.id,
      })
    );
    const storage = createLocalStorageMock({
      saveScheduledSessions: vi.fn(async () => undefined),
      saveActiveSession: vi.fn(async () => undefined),
    });
    vi.mocked(realTimeSyncService.deleteWithSync).mockResolvedValue([viewingChain]);

    const { result } = renderHook(() =>
      useRecycleBinDomain({
        state: stateRef.getState(),
        setState: stateRef.setState,
        storage,
      })
    );

    await act(async () => {
      await result.current.handleDeleteChain(deletingChain.id);
    });

    expect(stateRef.getState().viewingChainId).toBe(viewingChain.id);
  });

  it('should log persistence failures after successful delete', async () => {
    const chain = createUnitChain({ id: 'chain-log-delete' });
    const stateRef = createStateContainer(createAppState({ chains: [chain] }));
    const storage = createLocalStorageMock({
      saveScheduledSessions: vi.fn(async () => {
        throw new Error('save scheduled failed');
      }),
      saveActiveSession: vi.fn(async () => {
        throw new Error('save active failed');
      }),
    });
    vi.mocked(realTimeSyncService.deleteWithSync).mockResolvedValue([]);

    const { result } = renderHook(() =>
      useRecycleBinDomain({
        state: stateRef.getState(),
        setState: stateRef.setState,
        storage,
      })
    );

    await act(async () => {
      await result.current.handleDeleteChain(chain.id);
    });

    await Promise.resolve();

    expect(logger.error).toHaveBeenCalledWith(
      'RECYCLE_BIN',
      'Failed to persist scheduled sessions after delete',
      { chainId: chain.id },
      expect.any(Error)
    );
    expect(logger.error).toHaveBeenCalledWith(
      'RECYCLE_BIN',
      'Failed to clear active session after delete',
      { chainId: chain.id },
      expect.any(Error)
    );
  });

  it('should show delete error and reload active chains when delete fails', async () => {
    const chain = createUnitChain({ id: 'chain-error' });
    const fallback = [createUnitChain({ id: 'fallback-chain' })];
    const stateRef = createStateContainer(createAppState({ chains: [chain] }));
    const storage = createLocalStorageMock({
      getActiveChains: vi.fn(async () => fallback),
    });
    vi.mocked(realTimeSyncService.deleteWithSync).mockRejectedValue(new Error('delete failed'));
    vi.mocked(getSafeErrorDetailFromUnknown).mockReturnValue('network down');

    const { result } = renderHook(() =>
      useRecycleBinDomain({
        state: stateRef.getState(),
        setState: stateRef.setState,
        storage,
      })
    );

    await act(async () => {
      await result.current.handleDeleteChain(chain.id);
    });

    expect(toast.error).toHaveBeenCalledWith('Delete failed: network down');
    expect(storage.getActiveChains).toHaveBeenCalledTimes(1);
    expect(stateRef.getState().chains).toEqual(fallback);
    expect(stateRef.getState().chainsRevision).toBe(1);
    expect(logger.error).toHaveBeenCalledWith('RECYCLE_BIN', 'Delete failed', { chainId: chain.id }, expect.any(Error));
    expect(trMock).toHaveBeenCalledWith(expect.stringContaining('network down'), 'Delete failed: network down');
  });

  it('should warn user when delete recovery reload fails', async () => {
    const chain = createUnitChain({ id: 'chain-recover-fail' });
    const stateRef = createStateContainer(createAppState({ chains: [chain] }));
    const storage = createLocalStorageMock({
      getActiveChains: vi.fn(async () => {
        throw new Error('reload failed');
      }),
    });
    vi.mocked(realTimeSyncService.deleteWithSync).mockRejectedValue(new Error('delete failed'));

    const { result } = renderHook(() =>
      useRecycleBinDomain({
        state: stateRef.getState(),
        setState: stateRef.setState,
        storage,
      })
    );

    await act(async () => {
      await result.current.handleDeleteChain(chain.id);
    });

    expect(toast.warning).toHaveBeenCalledWith("Couldn't restore state after the error. Refresh the page to recover.");
    expect(trMock).toHaveBeenCalledWith(
      expect.any(String),
      "Couldn't restore state after the error. Refresh the page to recover."
    );
  });

  it('should handle partial restore failure with warning and refresh', async () => {
    const chain = createUnitChain({ id: 'chain-restore' });
    const fallback = [createUnitChain({ id: 'fresh-chain' })];
    const stateRef = createStateContainer(createAppState({ chains: [chain] }));
    const storage = createLocalStorageMock({
      getActiveChains: vi.fn(async () => fallback),
    });
    vi.mocked(realTimeSyncService.restoreWithSync).mockRejectedValue(
      new Error('Partial restore failure')
    );

    const { result } = renderHook(() =>
      useRecycleBinDomain({
        state: stateRef.getState(),
        setState: stateRef.setState,
        storage,
      })
    );

    await act(async () => {
      await result.current.handleRestoreChains([chain.id]);
    });

    expect(storage.getActiveChains).toHaveBeenCalledTimes(1);
    expect(stateRef.getState().chains).toEqual(fallback);
    expect(stateRef.getState().chainsRevision).toBe(1);
    expect(toast.warning).toHaveBeenCalledWith('Some chains may have failed to restore. Please check the recycle bin.');
    expect(trMock).toHaveBeenCalledWith(
      expect.stringMatching(/.+/),
      'Some chains may have failed to restore. Please check the recycle bin.'
    );
  });

  it('should show restore error for non-partial failures', async () => {
    const chain = createUnitChain({ id: 'chain-restore-generic-error' });
    const stateRef = createStateContainer(createAppState({ chains: [chain] }));
    vi.mocked(realTimeSyncService.restoreWithSync).mockRejectedValue(new Error('restore request exploded'));
    vi.mocked(getSafeErrorDetailFromUnknown).mockReturnValue('');

    const { result } = renderHook(() =>
      useRecycleBinDomain({
        state: stateRef.getState(),
        setState: stateRef.setState,
        storage: createLocalStorageMock(),
      })
    );

    await act(async () => {
      await result.current.handleRestoreChains([chain.id]);
    });

    expect(logger.error).toHaveBeenCalledWith(
      'RECYCLE_BIN',
      'Restore failed',
      { chainIds: [chain.id] },
      expect.any(Error)
    );
    expect(toast.error).toHaveBeenCalledWith('Restore failed. Check the console for details, then try again.');
    expect(trMock).toHaveBeenCalledWith(
      expect.stringMatching(/.+/),
      'Restore failed. Check the console for details, then try again.'
    );
  });

  it('should complete restore successfully', async () => {
    const chain = createUnitChain({ id: 'chain-restore-ok' });
    const restored = [createUnitChain({ id: 'restored-1' })];
    const stateRef = createStateContainer(createAppState({ chains: [chain] }));
    vi.mocked(realTimeSyncService.restoreWithSync).mockResolvedValue(restored);

    const { result } = renderHook(() =>
      useRecycleBinDomain({
        state: stateRef.getState(),
        setState: stateRef.setState,
        storage: createLocalStorageMock(),
      })
    );

    await act(async () => {
      await result.current.handleRestoreChains([chain.id]);
    });

    expect(stateRef.getState().chains).toEqual(restored);
    expect(stateRef.getState().chainsRevision).toBe(1);
  });

  it('should show permanent delete error when sync service fails', async () => {
    const chain = createUnitChain({ id: 'chain-permanent' });
    vi.mocked(realTimeSyncService.permanentDeleteWithSync).mockRejectedValue(new Error('hard delete failed'));
    vi.mocked(getSafeErrorDetailFromUnknown).mockReturnValue('permission denied');

    const { result } = renderHook(() =>
      useRecycleBinDomain({
        state: createAppState({ chains: [chain] }),
        setState: vi.fn(),
        storage: createLocalStorageMock(),
      })
    );

    await act(async () => {
      await result.current.handlePermanentDeleteChains([chain.id]);
    });

    expect(toast.error).toHaveBeenCalledWith('Permanent delete failed: permission denied');
    expect(logger.error).toHaveBeenCalledWith(
      'RECYCLE_BIN',
      'Permanent delete failed',
      { chainIds: [chain.id] },
      expect.any(Error)
    );
    expect(trMock).toHaveBeenCalledWith(
      expect.stringContaining('permission denied'),
      'Permanent delete failed: permission denied'
    );
  });

  it('should complete permanent delete successfully', async () => {
    const chain = createUnitChain({ id: 'chain-permanent-ok' });
    const updatedChains = [createUnitChain({ id: 'remaining-1' })];
    const stateRef = createStateContainer(createAppState({ chains: [chain] }));
    vi.mocked(realTimeSyncService.permanentDeleteWithSync).mockResolvedValue(updatedChains);

    const { result } = renderHook(() =>
      useRecycleBinDomain({
        state: stateRef.getState(),
        setState: stateRef.setState,
        storage: createLocalStorageMock(),
      })
    );

    await act(async () => {
      await result.current.handlePermanentDeleteChains([chain.id]);
    });

    expect(stateRef.getState().chains).toEqual(updatedChains);
    expect(stateRef.getState().chainsRevision).toBe(1);
  });
});
