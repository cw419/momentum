import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { AppState } from '../../../../types';
import {
  createAppState,
  createLocalStorageMock,
  createUnitChain,
} from '../../../../test/factories';
import { createPauseResumeHandlers } from '../pauseResume';

vi.mock('../../../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

function createStateContainer(initialState: AppState) {
  let state = initialState;
  const setState = vi.fn(
    (update: AppState | ((prev: AppState) => AppState)) => {
      state =
        typeof update === 'function'
          ? (update as (prev: AppState) => AppState)(state)
          : update;
    },
  );
  return {
    getState: () => state,
    setState,
  };
}

describe('createPauseResumeHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should pause active session and persist updated state', () => {
    const chain = createUnitChain({ id: 'chain-1' });
    const initialState = createAppState({
      chains: [chain],
      activeSession: {
        chainId: chain.id,
        startedAt: new Date('2026-02-02T10:00:00.000Z'),
        duration: 30,
        isPaused: false,
        totalPausedTime: 0,
      },
    });
    const stateRef = createStateContainer(initialState);
    const storage = createLocalStorageMock({
      saveActiveSession: vi.fn(async () => undefined),
    });

    const { handlePauseSession } = createPauseResumeHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage,
    });

    handlePauseSession();

    expect(storage.saveActiveSession).toHaveBeenCalledTimes(1);
    const persisted = vi.mocked(storage.saveActiveSession).mock.calls[0]?.[0];
    expect(persisted).toMatchObject({ isPaused: true });
    expect(persisted?.pausedAt).toBeInstanceOf(Date);
    expect(stateRef.getState().activeSession?.isPaused).toBe(true);
  });

  it('should resume paused session and accumulate paused time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-02T11:00:00.000Z'));
    const pausedAt = new Date('2026-02-02T10:59:40.000Z');

    const chain = createUnitChain({ id: 'chain-2' });
    const initialState = createAppState({
      chains: [chain],
      activeSession: {
        chainId: chain.id,
        startedAt: new Date('2026-02-02T10:00:00.000Z'),
        duration: 30,
        isPaused: true,
        pausedAt,
        totalPausedTime: 2000,
      },
    });
    const stateRef = createStateContainer(initialState);
    const storage = createLocalStorageMock({
      saveActiveSession: vi.fn(async () => undefined),
    });

    const { handleResumeSession } = createPauseResumeHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage,
    });

    handleResumeSession();

    const resumed = stateRef.getState().activeSession;
    expect(resumed?.isPaused).toBe(false);
    expect(resumed?.pausedAt).toBeUndefined();
    expect(resumed?.totalPausedTime).toBe(22000);
    expect(storage.saveActiveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        isPaused: false,
        totalPausedTime: 22000,
      }),
    );
  });

  it('should no-op without active session or without pausedAt', () => {
    const storage = createLocalStorageMock({
      saveActiveSession: vi.fn(async () => undefined),
    });
    const noSession = createStateContainer(
      createAppState({ activeSession: null }),
    );
    const noPausedAt = createStateContainer(
      createAppState({
        activeSession: {
          chainId: 'chain-id',
          startedAt: new Date(),
          duration: 10,
          isPaused: true,
          totalPausedTime: 0,
        },
      }),
    );

    createPauseResumeHandlers({
      state: noSession.getState(),
      setState: noSession.setState,
      storage,
    }).handlePauseSession();
    createPauseResumeHandlers({
      state: noSession.getState(),
      setState: noSession.setState,
      storage,
    }).handleResumeSession();
    createPauseResumeHandlers({
      state: noPausedAt.getState(),
      setState: noPausedAt.setState,
      storage,
    }).handleResumeSession();

    expect(storage.saveActiveSession).not.toHaveBeenCalled();
    expect(noSession.setState).not.toHaveBeenCalled();
  });
});
