import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { AppState } from '../../../../types';
import { createAppState, createLocalStorageMock, createUnitChain } from '../../../../test/factories';
import { createSchedulingHandlers } from '../scheduling';
import { queryOptimizer } from '../../../../utils/queryOptimizer';
import { notificationManager } from '../../../../utils/notifications';
import { toast } from '../../../../utils/toast';

vi.mock('../../../../utils/queryOptimizer', () => ({
  queryOptimizer: {
    onDataChange: vi.fn(),
  },
}));

vi.mock('../../../../utils/notifications', () => ({
  notificationManager: {
    notifyTaskCompleted: vi.fn(),
  },
}));

vi.mock('../../../../utils/toast', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('../../../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createStateContainer(initialState: AppState) {
  let state = initialState;
  const setState = vi.fn((update: AppState | ((prev: AppState) => AppState)) => {
    state = typeof update === 'function' ? (update as (prev: AppState) => AppState)(state) : update;
  });
  return {
    getState: () => state,
    setState,
  };
}

describe('createSchedulingHandlers', () => {
  const tr = (_zh: string, en: string) => en;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create scheduled session and increment auxiliary streak', async () => {
    const chain = createUnitChain({
      id: 'chain-1',
      auxiliaryDuration: 20,
      auxiliarySignal: 'bell',
      auxiliaryStreak: 4,
    });
    const stateRef = createStateContainer(createAppState({ chains: [chain], chainsRevision: 2 }));
    const storage = createLocalStorageMock({
      saveScheduledSessions: vi.fn(async () => undefined),
    });
    const safelySaveChains = vi.fn(async () => undefined);
    const setShowAuxiliaryJudgment = vi.fn();

    const { handleScheduleChain } = createSchedulingHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage,
      safelySaveChains,
      setShowAuxiliaryJudgment,
      tr,
    });

    handleScheduleChain(chain.id);
    await flushPromises();

    const nextState = stateRef.getState();
    expect(nextState.scheduledSessions).toHaveLength(1);
    expect(nextState.scheduledSessions[0]).toMatchObject({
      chainId: chain.id,
      auxiliarySignal: chain.auxiliarySignal,
    });
    expect(nextState.chains.find((item) => item.id === chain.id)?.auxiliaryStreak).toBe(5);
    expect(storage.saveScheduledSessions).toHaveBeenCalledWith(nextState.scheduledSessions);
    expect(safelySaveChains).toHaveBeenCalledTimes(1);
    expect(queryOptimizer.onDataChange).toHaveBeenCalledWith('chains');
  });

  it('should ignore duplicate scheduling and missing chains', async () => {
    const chain = createUnitChain({ id: 'chain-2' });
    const existingSession = {
      chainId: chain.id,
      scheduledAt: new Date(),
      expiresAt: new Date(Date.now() + 5000),
      auxiliarySignal: 's',
    };
    const stateRef = createStateContainer(
      createAppState({
        chains: [chain],
        scheduledSessions: [existingSession],
      })
    );
    const storage = createLocalStorageMock({
      saveScheduledSessions: vi.fn(async () => undefined),
    });
    const safelySaveChains = vi.fn(async () => undefined);

    const { handleScheduleChain } = createSchedulingHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage,
      safelySaveChains,
      setShowAuxiliaryJudgment: vi.fn(),
      tr,
    });

    handleScheduleChain(chain.id);
    handleScheduleChain('missing-chain');
    await flushPromises();

    expect(storage.saveScheduledSessions).not.toHaveBeenCalled();
    expect(safelySaveChains).not.toHaveBeenCalled();
    expect(stateRef.setState).not.toHaveBeenCalled();
  });

  it('should delegate cancel action to auxiliary judgment modal', () => {
    const setShowAuxiliaryJudgment = vi.fn();
    const { handleCancelScheduledSession } = createSchedulingHandlers({
      state: createAppState(),
      setState: vi.fn(),
      storage: createLocalStorageMock(),
      safelySaveChains: vi.fn(async () => undefined),
      setShowAuxiliaryJudgment,
      tr,
    });

    handleCancelScheduledSession('chain-3');

    expect(setShowAuxiliaryJudgment).toHaveBeenCalledWith('chain-3');
  });

  it('should complete booking, remove schedule, and increment streak', async () => {
    const chain = createUnitChain({ id: 'chain-4', auxiliaryStreak: 2, name: 'Booking Chain' });
    const stateRef = createStateContainer(
      createAppState({
        chains: [chain],
        scheduledSessions: [
          {
            chainId: chain.id,
            scheduledAt: new Date(),
            expiresAt: new Date(Date.now() + 10000),
            auxiliarySignal: 'signal',
          },
        ],
      })
    );
    const storage = createLocalStorageMock({
      saveScheduledSessions: vi.fn(async () => undefined),
    });
    const safelySaveChains = vi.fn(async () => undefined);

    const { handleCompleteBooking } = createSchedulingHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage,
      safelySaveChains,
      setShowAuxiliaryJudgment: vi.fn(),
      tr,
    });

    handleCompleteBooking(chain.id);
    await flushPromises();

    expect(stateRef.getState().scheduledSessions).toHaveLength(0);
    expect(stateRef.getState().chains.find((item) => item.id === chain.id)?.auxiliaryStreak).toBe(3);
    expect(notificationManager.notifyTaskCompleted).toHaveBeenCalledWith(chain.name, 3, 'Schedule completed');
    expect(storage.saveScheduledSessions).toHaveBeenCalledWith([]);
    expect(safelySaveChains).toHaveBeenCalledTimes(1);
  });

  it('should show toast when schedule persistence fails', async () => {
    const chain = createUnitChain({ id: 'chain-5' });
    const stateRef = createStateContainer(createAppState({ chains: [chain] }));
    const storage = createLocalStorageMock({
      saveScheduledSessions: vi.fn(async () => undefined),
    });
    const safelySaveChains = vi.fn(async () => {
      throw new Error('save failed');
    });

    const { handleScheduleChain } = createSchedulingHandlers({
      state: stateRef.getState(),
      setState: stateRef.setState,
      storage,
      safelySaveChains,
      setShowAuxiliaryJudgment: vi.fn(),
      tr,
    });

    handleScheduleChain(chain.id);
    await flushPromises();

    expect(toast.error).toHaveBeenCalledWith('Failed to schedule. Please try again.');
  });
});
