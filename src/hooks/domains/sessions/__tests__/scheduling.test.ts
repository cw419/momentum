import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppState } from '../../../../types';
import {
  createAppState,
  createLocalStorageMock,
  createUnitChain,
} from '../../../../test/factories';
import { createSchedulingHandlers } from '../scheduling';
import { queryOptimizer } from '../../../../utils/queryOptimizer';
import { systemNotificationService } from '../../../../services/platform/SystemNotificationService';
import { toast } from '../../../../utils/toast';
import { logger } from '../../../../utils/logger';

vi.mock('../../../../utils/queryOptimizer', () => ({
  queryOptimizer: {
    onDataChange: vi.fn(),
  },
}));

vi.mock('../../../../services/platform/SystemNotificationService', () => ({
  systemNotificationService: {
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

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

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

describe('createSchedulingHandlers', () => {
  const tr = (_zh: string, en: string) => en;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules the requested non-first chain without disturbing existing state', async () => {
    const now = new Date('2026-07-14T08:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const otherChain = createUnitChain({
      id: 'other-chain',
      auxiliaryStreak: 9,
    });
    const targetChain = createUnitChain({
      id: 'target-chain',
      auxiliaryDuration: 20,
      auxiliarySignal: 'bell',
      auxiliaryStreak: 4,
    });
    const otherSchedule = {
      chainId: otherChain.id,
      scheduledAt: new Date('2026-07-14T07:00:00.000Z'),
      expiresAt: new Date('2026-07-14T07:15:00.000Z'),
      auxiliarySignal: 'other-signal',
    };
    const stateRef = createStateContainer(
      createAppState({
        chains: [otherChain, targetChain],
        chainsRevision: 9,
        scheduledSessions: [otherSchedule],
      }),
    );
    const storage = createLocalStorageMock({
      setScheduledSession: vi.fn(async () => undefined),
    });
    const safelySaveChains = vi.fn(async () => undefined);
    const setShowAuxiliaryJudgment = vi.fn();

    const { handleScheduleChain } = createSchedulingHandlers({
      getState: stateRef.getState,
      setState: stateRef.setState,
      storage,
      safelySaveChains,
      setShowAuxiliaryJudgment,
      tr,
    });

    handleScheduleChain(targetChain.id);
    await flushPromises();

    const nextState = stateRef.getState();
    const expectedSession = {
      chainId: targetChain.id,
      scheduledAt: now,
      expiresAt: new Date('2026-07-14T08:20:00.000Z'),
      auxiliarySignal: targetChain.auxiliarySignal,
    };
    expect(nextState.scheduledSessions).toEqual([
      otherSchedule,
      expectedSession,
    ]);
    expect(nextState.chains).toEqual([
      otherChain,
      { ...targetChain, auxiliaryStreak: 5 },
    ]);
    expect(nextState.chains[0]).toBe(otherChain);
    expect(nextState.chainsRevision).toBe(10);
    expect(storage.setScheduledSession).toHaveBeenCalledWith(expectedSession);
    expect(safelySaveChains).toHaveBeenCalledWith(nextState.chains);
    expect(queryOptimizer.onDataChange).toHaveBeenCalledWith('chains');
  });

  it('ignores a duplicate schedule for the requested chain', async () => {
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
      }),
    );
    const storage = createLocalStorageMock({
      setScheduledSession: vi.fn(async () => undefined),
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
    await flushPromises();

    expect(storage.setScheduledSession).not.toHaveBeenCalled();
    expect(safelySaveChains).not.toHaveBeenCalled();
    expect(stateRef.setState).not.toHaveBeenCalled();
  });

  it('does not schedule a missing chain even when another chain exists', async () => {
    const existingChain = createUnitChain({ id: 'existing-chain' });
    const stateRef = createStateContainer(
      createAppState({ chains: [existingChain], scheduledSessions: [] }),
    );
    const storage = createLocalStorageMock({
      setScheduledSession: vi.fn(async () => undefined),
    });
    const safelySaveChains = vi.fn(async () => undefined);

    const { handleScheduleChain } = createSchedulingHandlers({
      getState: stateRef.getState,
      setState: stateRef.setState,
      storage,
      safelySaveChains,
      setShowAuxiliaryJudgment: vi.fn(),
      tr,
    });

    handleScheduleChain('missing-chain');
    await flushPromises();

    expect(storage.setScheduledSession).not.toHaveBeenCalled();
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

  it('completes only the requested non-first booking and preserves other schedules', async () => {
    const completionTr = vi.fn((_zh: string, en: string) => en);
    const otherChain = createUnitChain({
      id: 'other-chain',
      auxiliaryStreak: 7,
      name: 'Other Chain',
    });
    const targetChain = createUnitChain({
      id: 'target-chain',
      auxiliaryStreak: 2,
      name: 'Booking Chain',
    });
    const otherSchedule = {
      chainId: otherChain.id,
      scheduledAt: new Date('2026-07-14T08:00:00.000Z'),
      expiresAt: new Date('2026-07-14T08:10:00.000Z'),
      auxiliarySignal: 'other-signal',
    };
    const targetSchedule = {
      chainId: targetChain.id,
      scheduledAt: new Date('2026-07-14T08:05:00.000Z'),
      expiresAt: new Date('2026-07-14T08:15:00.000Z'),
      auxiliarySignal: 'target-signal',
    };
    const stateRef = createStateContainer(
      createAppState({
        chains: [otherChain, targetChain],
        chainsRevision: 4,
        scheduledSessions: [otherSchedule, targetSchedule],
      }),
    );
    const storage = createLocalStorageMock({
      removeScheduledSession: vi.fn(async () => undefined),
    });
    const safelySaveChains = vi.fn(async () => undefined);

    const { handleCompleteBooking } = createSchedulingHandlers({
      getState: stateRef.getState,
      setState: stateRef.setState,
      storage,
      safelySaveChains,
      setShowAuxiliaryJudgment: vi.fn(),
      tr: completionTr,
    });

    handleCompleteBooking(targetChain.id);
    await flushPromises();

    const nextState = stateRef.getState();
    expect(nextState.scheduledSessions).toEqual([otherSchedule]);
    expect(nextState.chains).toEqual([
      otherChain,
      { ...targetChain, auxiliaryStreak: 3 },
    ]);
    expect(nextState.chains[0]).toBe(otherChain);
    expect(nextState.chainsRevision).toBe(5);
    expect(systemNotificationService.notifyTaskCompleted).toHaveBeenCalledWith(
      targetChain.name,
      3,
      'Schedule completed',
    );
    expect(storage.removeScheduledSession).toHaveBeenCalledWith(targetChain.id);
    expect(safelySaveChains).toHaveBeenCalledWith(nextState.chains);
    expect(completionTr).toHaveBeenCalledWith(
      '预约已完成',
      'Schedule completed',
    );
  });

  it('does nothing when completing a missing chain', async () => {
    const existingChain = createUnitChain({ id: 'existing-chain' });
    const stateRef = createStateContainer(
      createAppState({ chains: [existingChain], scheduledSessions: [] }),
    );
    const storage = createLocalStorageMock({
      removeScheduledSession: vi.fn(async () => undefined),
    });
    const safelySaveChains = vi.fn(async () => undefined);

    const { handleCompleteBooking } = createSchedulingHandlers({
      getState: stateRef.getState,
      setState: stateRef.setState,
      storage,
      safelySaveChains,
      setShowAuxiliaryJudgment: vi.fn(),
      tr,
    });

    expect(() => handleCompleteBooking('missing-chain')).not.toThrow();
    await flushPromises();

    expect(storage.removeScheduledSession).not.toHaveBeenCalled();
    expect(safelySaveChains).not.toHaveBeenCalled();
    expect(stateRef.setState).not.toHaveBeenCalled();
    expect(
      systemNotificationService.notifyTaskCompleted,
    ).not.toHaveBeenCalled();
  });

  it('reports both completion persistence failures without rolling back local state', async () => {
    const chain = createUnitChain({ id: 'chain-with-errors' });
    const stateRef = createStateContainer(
      createAppState({
        chains: [chain],
        scheduledSessions: [
          {
            chainId: chain.id,
            scheduledAt: new Date('2026-07-14T08:00:00.000Z'),
            expiresAt: new Date('2026-07-14T08:10:00.000Z'),
            auxiliarySignal: 'signal',
          },
        ],
      }),
    );
    const storage = createLocalStorageMock({
      removeScheduledSession: vi.fn(async () => {
        throw new Error('remove failed');
      }),
    });
    const safelySaveChains = vi.fn(async () => {
      throw new Error('save failed');
    });

    const { handleCompleteBooking } = createSchedulingHandlers({
      getState: stateRef.getState,
      setState: stateRef.setState,
      storage,
      safelySaveChains,
      setShowAuxiliaryJudgment: vi.fn(),
      tr,
    });

    handleCompleteBooking(chain.id);
    await flushPromises();

    expect(stateRef.getState().scheduledSessions).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      'SESSIONS',
      'Failed to persist scheduled sessions after completing booking',
      { chainId: chain.id },
      expect.objectContaining({ message: 'remove failed' }),
    );
    expect(logger.error).toHaveBeenCalledWith(
      'SESSIONS',
      '完成预约时保存链条数据失败',
      undefined,
      expect.objectContaining({ message: 'save failed' }),
    );
    expect(queryOptimizer.onDataChange).toHaveBeenCalledWith('chains');
  });

  it('should show toast when schedule persistence fails', async () => {
    const failureTr = vi.fn((_zh: string, en: string) => en);
    const chain = createUnitChain({ id: 'chain-5' });
    const stateRef = createStateContainer(createAppState({ chains: [chain] }));
    const storage = createLocalStorageMock({
      setScheduledSession: vi.fn(async () => undefined),
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
      tr: failureTr,
    });

    handleScheduleChain(chain.id);
    await flushPromises();

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to schedule. Please try again.',
    );
    expect(failureTr).toHaveBeenCalledWith(
      '预约失败，请重试',
      'Failed to schedule. Please try again.',
    );
    expect(logger.error).toHaveBeenCalledWith(
      'SESSIONS',
      'Failed to schedule chain',
      { chainId: chain.id },
      expect.objectContaining({ message: 'save failed' }),
    );
  });
});
