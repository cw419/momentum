import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../../../types';
import { createAppState, createGroupChain, createLocalStorageMock, createSupabaseStorageMock, createUnitChain } from '../../../../test/factories';
import { createCompletionHandlers } from '../completion';
import { queryOptimizer } from '../../../../utils/queryOptimizer';
import { forwardTimerManager } from '../../../../utils/forwardTimer';
import { notificationManager } from '../../../../utils/notifications';
import { emitPointsChanged } from '../../../../utils/pointsEvents';
import { incrementGroupCompletionCount, isGroupFullyCompleted, resetGroupCompletionCount } from '../../../../utils/chainTree';
import { logger } from '../../../../utils/logger';

vi.mock('../../../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../../utils/queryOptimizer', () => ({
  queryOptimizer: {
    memoizedBuildChainTree: vi.fn(() => []),
    onDataChange: vi.fn(),
  },
}));

vi.mock('../../../../utils/forwardTimer', () => ({
  forwardTimerManager: {
    stopTimer: vi.fn(() => 0),
    clearTimer: vi.fn(),
  },
}));

vi.mock('../../../../utils/notifications', () => ({
  notificationManager: {
    notifyTaskCompleted: vi.fn(),
  },
}));

vi.mock('../../../../utils/pointsEvents', () => ({
  emitPointsChanged: vi.fn(),
}));

vi.mock('../../../../utils/chainTree', () => ({
  incrementGroupCompletionCount: vi.fn((chains) => chains),
  isGroupFullyCompleted: vi.fn(() => false),
  resetGroupCompletionCount: vi.fn((chains) => chains),
}));

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createStateContainer(initialState: AppState) {
  let state = initialState;
  const setState: Dispatch<SetStateAction<AppState>> = (update) => {
    state = typeof update === 'function' ? (update as (prev: AppState) => AppState)(state) : update;
  };
  return {
    getState: () => state,
    setState,
  };
}

describe('createCompletionHandlers', () => {
  const tr = (zh: string, _en: string) => zh;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update local state and persist completion when session completes', async () => {
    const group = createGroupChain({ id: 'group-1', name: 'Parent Group', currentStreak: 2 });
    const chain = createUnitChain({
      id: 'chain-1',
      name: 'Unit 1',
      parentId: group.id,
      currentStreak: 1,
      totalCompletions: 3,
      duration: 25,
    });

    const initialState = createAppState({
      chains: [group, chain],
      activeSession: {
        chainId: chain.id,
        startedAt: new Date('2026-02-01T10:00:00.000Z'),
        duration: 25,
        isPaused: false,
        totalPausedTime: 0,
      },
      completionHistory: [],
      chainsRevision: 3,
    });
    const stateRef = createStateContainer(initialState);

    const storage = createLocalStorageMock({
      saveCompletionHistory: vi.fn(async () => undefined),
      saveActiveSession: vi.fn(async () => undefined),
      updateTaskTimeStats: vi.fn(async () => undefined),
    });
    const safelySaveChains = vi.fn(async () => undefined);
    const setActiveSessionId = vi.fn();

    vi.mocked(queryOptimizer.memoizedBuildChainTree).mockReturnValue([
      { id: group.id, type: 'group', name: group.name },
    ] as unknown as ReturnType<typeof queryOptimizer.memoizedBuildChainTree>);
    vi.mocked(isGroupFullyCompleted).mockReturnValue(true);
    vi.mocked(incrementGroupCompletionCount).mockImplementation((chains) =>
      chains.map((item) => (item.id === group.id ? { ...item, currentStreak: item.currentStreak + 1 } : item))
    );

    const { handleCompleteSession } = createCompletionHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage,
      safelySaveChains,
      activeSessionId: null,
      setActiveSessionId,
      tr,
    });

    handleCompleteSession('desc', 'notes');
    await flushPromises();

    const nextState = stateRef.getState();
    const updatedChain = nextState.chains.find((item) => item.id === chain.id);
    expect(updatedChain?.currentStreak).toBe(2);
    expect(updatedChain?.totalCompletions).toBe(4);
    expect(nextState.activeSession).toBeNull();
    expect(nextState.currentView).toBe('dashboard');
    expect(nextState.completionHistory).toHaveLength(1);
    expect(nextState.completionHistory[0]).toMatchObject({
      chainId: chain.id,
      wasSuccessful: true,
      description: 'desc',
      notes: 'notes',
      actualDuration: 25,
      isForwardTimed: false,
    });

    expect(safelySaveChains).toHaveBeenCalledTimes(1);
    expect(storage.saveCompletionHistory).toHaveBeenCalledWith(nextState.completionHistory);
    expect(storage.saveActiveSession).toHaveBeenCalledWith(null);
    expect(storage.updateTaskTimeStats).toHaveBeenCalledWith(chain.id, 25);
    expect(notificationManager.notifyTaskCompleted).toHaveBeenCalled();
    expect(setActiveSessionId).toHaveBeenCalledWith(null);
    expect(queryOptimizer.memoizedBuildChainTree).toHaveBeenCalledWith(expect.any(Array), 4);
    expect(isGroupFullyCompleted).toHaveBeenCalledWith(expect.objectContaining({ id: group.id, type: 'group' }));
    expect(incrementGroupCompletionCount).toHaveBeenCalledWith(expect.any(Array), group.id);
    expect(notificationManager.notifyTaskCompleted).toHaveBeenCalledWith(
      group.name,
      expect.any(Number),
      '任务群完成一轮'
    );
    expect(emitPointsChanged).not.toHaveBeenCalled();
  });

  it('should only update the completed chain and keep sibling chains untouched', async () => {
    const completed = createUnitChain({
      id: 'completed-chain',
      name: 'Completed',
      currentStreak: 1,
      totalCompletions: 2,
    });
    const untouched = createUnitChain({
      id: 'untouched-chain',
      name: 'Untouched',
      currentStreak: 9,
      totalCompletions: 99,
    });

    const stateRef = createStateContainer(
      createAppState({
        chains: [completed, untouched],
        activeSession: {
          chainId: completed.id,
          startedAt: new Date('2026-02-01T10:00:00.000Z'),
          duration: 20,
          isPaused: false,
          totalPausedTime: 0,
        },
      })
    );

    const storage = createLocalStorageMock({
      saveCompletionHistory: vi.fn(async () => undefined),
      saveActiveSession: vi.fn(async () => undefined),
      updateTaskTimeStats: vi.fn(async () => undefined),
    });

    const { handleCompleteSession } = createCompletionHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage,
      safelySaveChains: vi.fn(async () => undefined),
      activeSessionId: null,
      setActiveSessionId: vi.fn(),
      tr,
    });

    handleCompleteSession();
    await flushPromises();

    const nextState = stateRef.getState();
    const completedNext = nextState.chains.find((item) => item.id === completed.id);
    const untouchedNext = nextState.chains.find((item) => item.id === untouched.id);

    expect(completedNext).toMatchObject({ currentStreak: 2, totalCompletions: 3 });
    expect(untouchedNext).toMatchObject({ currentStreak: 9, totalCompletions: 99 });
    expect(queryOptimizer.memoizedBuildChainTree).not.toHaveBeenCalled();
    expect(incrementGroupCompletionCount).not.toHaveBeenCalled();
  });

  it('should use forward timer for durationless chains and invoke pet callback', async () => {
    const chain = createUnitChain({
      id: 'durationless-chain',
      isDurationless: true,
      duration: 0,
      currentStreak: 0,
    });
    const initialState = createAppState({
      chains: [chain],
      activeSession: {
        chainId: chain.id,
        startedAt: new Date('2026-02-01T11:00:00.000Z'),
        duration: 0,
        isPaused: false,
        totalPausedTime: 0,
      },
    });
    const stateRef = createStateContainer(initialState);

    const storage = createLocalStorageMock({
      saveCompletionHistory: vi.fn(async () => undefined),
      saveActiveSession: vi.fn(async () => undefined),
      updateTaskTimeStats: vi.fn(async () => undefined),
    });
    const safelySaveChains = vi.fn(async () => undefined);
    const onPetTaskCompleted = vi.fn();

    vi.mocked(forwardTimerManager.stopTimer).mockReturnValue(125);

    const { handleCompleteSession } = createCompletionHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage,
      safelySaveChains,
      activeSessionId: null,
      setActiveSessionId: vi.fn(),
      onPetTaskCompleted,
      tr,
    });

    handleCompleteSession();
    await flushPromises();

    expect(forwardTimerManager.stopTimer).toHaveBeenCalledWith(
      `${chain.id}_${initialState.activeSession?.startedAt.getTime()}`
    );
    expect(storage.updateTaskTimeStats).toHaveBeenCalledWith(chain.id, 3);
    expect(onPetTaskCompleted).toHaveBeenCalledWith(3, true);
    expect(stateRef.getState().completionHistory[0].actualDuration).toBe(3);
    expect(stateRef.getState().completionHistory[0].isForwardTimed).toBe(true);
  });

  it('should persist supabase completion and clear active session with points emit', async () => {
    const chain = createUnitChain({ id: 'supa-chain', currentStreak: 10 });
    const initialState = createAppState({
      chains: [chain],
      activeSession: {
        chainId: chain.id,
        startedAt: new Date('2026-02-01T12:00:00.000Z'),
        duration: 15,
        isPaused: false,
        totalPausedTime: 0,
      },
    });
    const stateRef = createStateContainer(initialState);

    const storage = createSupabaseStorageMock({
      saveCompletionHistory: vi.fn(async () => undefined),
      saveActiveSession: vi.fn(async () => undefined),
    });
    const setActiveSessionId = vi.fn();
    const safelySaveChains = vi.fn(async () => undefined);

    const { handleCompleteSession } = createCompletionHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage,
      safelySaveChains,
      activeSessionId: 'session-id',
      setActiveSessionId,
      tr,
    });

    handleCompleteSession();
    await flushPromises();

    expect(storage.saveCompletionHistory).toHaveBeenCalledTimes(1);
    const persisted = vi.mocked(storage.saveCompletionHistory).mock.calls[0]?.[0];
    expect(persisted).toHaveLength(1);
    expect(persisted?.[0]).toMatchObject({ chainId: chain.id, wasSuccessful: true });
    expect(storage.saveActiveSession).toHaveBeenCalledWith(null);
    expect(setActiveSessionId).toHaveBeenCalledWith(null);
    expect(emitPointsChanged).toHaveBeenCalledTimes(1);
  });

  it('should emit cleanup side-effects even when supabase persistence fails', async () => {
    const chain = createUnitChain({ id: 'supa-fail-chain', currentStreak: 2 });
    const initialState = createAppState({
      chains: [chain],
      activeSession: {
        chainId: chain.id,
        startedAt: new Date('2026-02-01T12:00:00.000Z'),
        duration: 15,
        isPaused: false,
        totalPausedTime: 0,
      },
    });
    const stateRef = createStateContainer(initialState);

    const storage = createSupabaseStorageMock({
      saveCompletionHistory: vi.fn(async () => {
        throw new Error('history failed');
      }),
      saveActiveSession: vi.fn(async () => {
        throw new Error('active session failed');
      }),
    });

    const setActiveSessionId = vi.fn();
    const { handleCompleteSession } = createCompletionHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage,
      safelySaveChains: vi.fn(async () => undefined),
      activeSessionId: 'supabase-session-id',
      setActiveSessionId,
      tr,
    });

    handleCompleteSession();
    await flushPromises();

    expect(setActiveSessionId).toHaveBeenCalledWith(null);
    expect(emitPointsChanged).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'SESSIONS',
      'Failed to persist completion history after completion',
      undefined,
      expect.any(Error)
    );
    expect(logger.error).toHaveBeenCalledWith(
      'SESSIONS',
      'Failed to clear active session after completion',
      undefined,
      expect.any(Error)
    );
  });

  it('should log unexpected supabase cleanup errors from cleanup callback', async () => {
    const chain = createUnitChain({ id: 'supa-unexpected-chain', currentStreak: 2 });
    const initialState = createAppState({
      chains: [chain],
      activeSession: {
        chainId: chain.id,
        startedAt: new Date('2026-02-01T12:00:00.000Z'),
        duration: 15,
        isPaused: false,
        totalPausedTime: 0,
      },
    });
    const stateRef = createStateContainer(initialState);

    const storage = createSupabaseStorageMock({
      saveCompletionHistory: vi.fn(async () => undefined),
      saveActiveSession: vi.fn(async () => undefined),
    });

    const setActiveSessionId = vi.fn(() => {
      throw new Error('set active session id failed');
    });
    const { handleCompleteSession } = createCompletionHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage,
      safelySaveChains: vi.fn(async () => undefined),
      activeSessionId: 'supabase-session-id',
      setActiveSessionId,
      tr,
    });

    handleCompleteSession();
    await flushPromises();

    expect(logger.error).toHaveBeenCalledWith(
      'SESSIONS',
      'Unexpected completion cleanup error',
      undefined,
      expect.any(Error)
    );
  });

  it('should reset streak and clear timer when interrupting a durationless session', async () => {
    const chain = createUnitChain({
      id: 'interrupt-chain',
      isDurationless: true,
      currentStreak: 6,
      totalFailures: 2,
      parentId: 'group-9',
    });
    const initialState = createAppState({
      chains: [chain],
      activeSession: {
        chainId: chain.id,
        startedAt: new Date('2026-02-01T13:00:00.000Z'),
        duration: 20,
        isPaused: false,
        totalPausedTime: 0,
      },
    });
    const stateRef = createStateContainer(initialState);
    const storage = createLocalStorageMock({
      saveCompletionHistory: vi.fn(async () => undefined),
      saveActiveSession: vi.fn(async () => undefined),
    });
    const safelySaveChains = vi.fn(async () => undefined);

    vi.mocked(resetGroupCompletionCount).mockImplementation((chains) => chains);

    const { handleInterruptSession } = createCompletionHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage,
      safelySaveChains,
      activeSessionId: null,
      setActiveSessionId: vi.fn(),
      tr,
    });

    handleInterruptSession('manual-stop');
    await flushPromises();

    expect(forwardTimerManager.clearTimer).toHaveBeenCalledWith(
      `${chain.id}_${initialState.activeSession?.startedAt.getTime()}`
    );
    const nextState = stateRef.getState();
    const updated = nextState.chains.find((item) => item.id === chain.id);
    expect(updated?.currentStreak).toBe(0);
    expect(updated?.totalFailures).toBe(3);
    expect(nextState.activeSession).toBeNull();
    expect(nextState.completionHistory.at(-1)).toMatchObject({
      chainId: chain.id,
      wasSuccessful: false,
      reasonForFailure: 'manual-stop',
    });
  });

  it('should use default interrupt reason when reason is not provided', async () => {
    const chain = createUnitChain({
      id: 'interrupt-default-reason',
      isDurationless: false,
      currentStreak: 3,
      totalFailures: 1,
    });

    const stateRef = createStateContainer(
      createAppState({
        chains: [chain],
        activeSession: {
          chainId: chain.id,
          startedAt: new Date('2026-02-01T13:00:00.000Z'),
          duration: 20,
          isPaused: false,
          totalPausedTime: 0,
        },
      })
    );

    const { handleInterruptSession } = createCompletionHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage: createLocalStorageMock({
        saveCompletionHistory: vi.fn(async () => undefined),
        saveActiveSession: vi.fn(async () => undefined),
      }),
      safelySaveChains: vi.fn(async () => undefined),
      activeSessionId: null,
      setActiveSessionId: vi.fn(),
      tr,
    });

    handleInterruptSession();
    await flushPromises();

    expect(stateRef.getState().completionHistory.at(-1)?.reasonForFailure).toBe('用户主动中断');
  });

  it('should not reset group completion count when interrupted chain itself is a group', async () => {
    const group = createGroupChain({
      id: 'group-self',
      parentId: 'parent-group',
      currentStreak: 4,
      totalFailures: 2,
    });

    const stateRef = createStateContainer(
      createAppState({
        chains: [group],
        activeSession: {
          chainId: group.id,
          startedAt: new Date('2026-02-01T13:00:00.000Z'),
          duration: 20,
          isPaused: false,
          totalPausedTime: 0,
        },
      })
    );

    const { handleInterruptSession } = createCompletionHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage: createLocalStorageMock({
        saveCompletionHistory: vi.fn(async () => undefined),
        saveActiveSession: vi.fn(async () => undefined),
      }),
      safelySaveChains: vi.fn(async () => undefined),
      activeSessionId: null,
      setActiveSessionId: vi.fn(),
      tr,
    });

    handleInterruptSession('group-fail');
    await flushPromises();

    expect(resetGroupCompletionCount).not.toHaveBeenCalled();
  });

  it('should no-op when completing or interrupting without active session / chain', async () => {
    const chain = createUnitChain({ id: 'valid-chain' });
    const stateRefNoSession = createStateContainer(createAppState({ chains: [chain], activeSession: null }));
    const storage = createLocalStorageMock({
      saveCompletionHistory: vi.fn(async () => undefined),
      saveActiveSession: vi.fn(async () => undefined),
    });

    const noSessionHandlers = createCompletionHandlers({
      state: stateRefNoSession.getState(),
      setState: stateRefNoSession.setState,
      storage,
      safelySaveChains: vi.fn(async () => undefined),
      activeSessionId: null,
      setActiveSessionId: vi.fn(),
      tr,
    });

    noSessionHandlers.handleCompleteSession();
    noSessionHandlers.handleInterruptSession('reason');
    await flushPromises();

    expect(storage.saveCompletionHistory).not.toHaveBeenCalled();
    expect(stateRefNoSession.getState().completionHistory).toHaveLength(0);

    const stateRefMissingChain = createStateContainer(
      createAppState({
        chains: [chain],
        activeSession: {
          chainId: 'missing-chain-id',
          startedAt: new Date('2026-02-01T13:00:00.000Z'),
          duration: 20,
          isPaused: false,
          totalPausedTime: 0,
        },
      })
    );
    const missingChainHandlers = createCompletionHandlers({
      state: stateRefMissingChain.getState(),
      setState: stateRefMissingChain.setState,
      storage,
      safelySaveChains: vi.fn(async () => undefined),
      activeSessionId: null,
      setActiveSessionId: vi.fn(),
      tr,
    });

    missingChainHandlers.handleCompleteSession();
    missingChainHandlers.handleInterruptSession();
    await flushPromises();

    expect(stateRefMissingChain.getState().completionHistory).toHaveLength(0);
  });

  it('should persist only one interrupt history record for supabase sessions', async () => {
    const chain = createUnitChain({ id: 'supa-interrupt-chain', currentStreak: 5, totalFailures: 1 });
    const stateRef = createStateContainer(
      createAppState({
        chains: [chain],
        activeSession: {
          chainId: chain.id,
          startedAt: new Date('2026-02-01T15:00:00.000Z'),
          duration: 30,
          isPaused: false,
          totalPausedTime: 0,
        },
      })
    );

    const storage = createSupabaseStorageMock({
      saveCompletionHistory: vi.fn(async () => undefined),
      saveActiveSession: vi.fn(async () => undefined),
    });
    const setActiveSessionId = vi.fn();

    const { handleInterruptSession } = createCompletionHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage,
      safelySaveChains: vi.fn(async () => undefined),
      activeSessionId: 'supabase-session-id',
      setActiveSessionId,
      tr,
    });

    handleInterruptSession('manual-stop');
    await flushPromises();

    const persisted = vi.mocked(storage.saveCompletionHistory).mock.calls[0]?.[0];
    expect(persisted).toHaveLength(1);
    expect(persisted?.[0]).toMatchObject({
      chainId: chain.id,
      wasSuccessful: false,
      reasonForFailure: 'manual-stop',
    });
    expect(setActiveSessionId).toHaveBeenCalledWith(null);
    expect(emitPointsChanged).toHaveBeenCalled();
  });

  it('should still update state when persistence fails', async () => {
    const chain = createUnitChain({ id: 'persist-fail-chain', currentStreak: 0 });
    const initialState = createAppState({
      chains: [chain],
      activeSession: {
        chainId: chain.id,
        startedAt: new Date('2026-02-01T14:00:00.000Z'),
        duration: 10,
        isPaused: false,
        totalPausedTime: 0,
      },
    });
    const stateRef = createStateContainer(initialState);
    const storage = createLocalStorageMock({
      saveCompletionHistory: vi.fn(async () => {
        throw new Error('history fail');
      }),
      saveActiveSession: vi.fn(async () => {
        throw new Error('session fail');
      }),
      updateTaskTimeStats: vi.fn(async () => {
        throw new Error('stats fail');
      }),
    });
    const safelySaveChains = vi.fn(async () => {
      throw new Error('chain fail');
    });

    const { handleCompleteSession } = createCompletionHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage,
      safelySaveChains,
      activeSessionId: null,
      setActiveSessionId: vi.fn(),
      tr,
    });

    handleCompleteSession();
    await flushPromises();

    expect(stateRef.getState().activeSession).toBeNull();
    expect(stateRef.getState().completionHistory).toHaveLength(1);
    expect(queryOptimizer.onDataChange).toHaveBeenCalledWith('chains');
    expect(logger.error).toHaveBeenCalledWith(
      'SESSIONS',
      'Failed to persist completion history after completion',
      undefined,
      expect.any(Error)
    );
    expect(logger.error).toHaveBeenCalledWith(
      'SESSIONS',
      'Failed to clear active session after completion',
      undefined,
      expect.any(Error)
    );
    expect(logger.error).toHaveBeenCalledWith(
      'SESSIONS',
      'Failed to update task time stats after completion',
      { chainId: chain.id },
      expect.any(Error)
    );
    expect(logger.error).toHaveBeenCalledWith(
      'SESSIONS',
      expect.stringContaining('保存链条'),
      undefined,
      expect.any(Error)
    );
  });
});
