import type { Dispatch, SetStateAction } from 'react';
import type { AppState, CompletionHistory } from '../../../types';
import type { MomentumStorage } from '../../../storage/MomentumStorage';
import { hasStorageCapability } from '../../../storage/ports';
import type { SafelySaveChains } from '../useChainsDomain';
import { resolveAppStateReader } from '../appStateAccess';
import { resetGroupCompletionCount } from '../../../utils/chainTree';
import { forwardTimerManager } from '../../../utils/forwardTimer';
import { logger } from '../../../utils/logger';
import { emitPointsChanged } from '../../../utils/pointsEvents';
import { queryOptimizer } from '../../../utils/queryOptimizer';
import { normalizeUnknownError } from '../../../utils/errors/normalizeError';
import type { TaskLifecycleEvent } from '../../../types';
import type { TaskLifecycleEventPublisher } from '../../../services/task-lifecycle/TaskLifecycleEventBus';
import { notifyTaskCompleted } from './sessionNotifications';
import { createCompletionHistoryId } from '../../../utils/storage/history';
import {
  computeActualDuration,
  maybeIncrementGroupCycleCompletion,
  updateChainsForFailure,
  updateChainsForSuccess,
} from './completionState';
import { setPlanItemStatus } from '../../../utils/dailyPlans';

async function persistCompletionHistoryAndCleanupSupabase(
  storage: MomentumStorage,
  record: CompletionHistory,
  setActiveSessionId: (sessionId: string | null) => void,
  context: 'completion' | 'interrupt',
): Promise<void> {
  try {
    await storage.appendCompletionHistory(record);
  } catch (error) {
    logger.error(
      'SESSIONS',
      `Failed to persist completion history after ${context}`,
      undefined,
      normalizeUnknownError(error),
    );
  } finally {
    setActiveSessionId(null);
    try {
      await storage.saveActiveSession(null);
    } catch (error) {
      logger.error(
        'SESSIONS',
        `Failed to clear active session after ${context}`,
        undefined,
        normalizeUnknownError(error),
      );
    } finally {
      emitPointsChanged();
    }
  }
}

interface CreateCompletionHandlersParams {
  state?: AppState;
  getState?: () => AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  safelySaveChains: SafelySaveChains;
  activeSessionId: string | null;
  setActiveSessionId: (sessionId: string | null) => void;
  onNavigateToDashboard?: () => void;
  onPetTaskCompleted?: (duration: number, wasSuccessful: boolean) => void;
  taskLifecycleEvents?: TaskLifecycleEventPublisher;
  tr: (zh: string, en: string) => string;
}

interface CompletionOverrides {
  completedAt: Date;
  actualDuration: number;
}

export function createCompletionHandlers({
  state,
  getState,
  setState,
  storage,
  safelySaveChains,
  activeSessionId,
  setActiveSessionId,
  onNavigateToDashboard,
  onPetTaskCompleted,
  taskLifecycleEvents,
  tr,
}: CreateCompletionHandlersParams) {
  const readState = resolveAppStateReader({ state, getState });
  function publishTaskLifecycleEvent(payload: TaskLifecycleEvent): void {
    taskLifecycleEvents?.publish(payload);
  }

  function persistChains(
    updatedChains: AppState['chains'],
    context: string,
  ): void {
    safelySaveChains(updatedChains).catch((error) => {
      queryOptimizer.onDataChange('chains');
      logger.error(
        'SESSIONS',
        context,
        undefined,
        normalizeUnknownError(error),
      );
    });
  }

  function resolveDailyPlanItemId(
    currentState: AppState,
    activeSession: NonNullable<AppState['activeSession']>,
  ): string | undefined {
    if (activeSession.dailyPlanItemId) return activeSession.dailyPlanItemId;

    // Compatibility for sessions restored from storage created before
    // dailyPlanItemId was persisted on the active session.
    return (currentState.dailyPlans ?? [])
      .flatMap((plan) => plan.items)
      .find(
        (item) =>
          item.chainId === activeSession.chainId &&
          item.status === 'pending' &&
          item.startedAt?.getTime() === activeSession.startedAt.getTime(),
      )?.id;
  }

  function persistCompletionHistoryAndCleanup(
    record: CompletionHistory,
    context: 'completion' | 'interrupt',
  ): void {
    if (activeSessionId && hasStorageCapability(storage, 'betting')) {
      persistCompletionHistoryAndCleanupSupabase(
        storage,
        record,
        setActiveSessionId,
        context,
      ).catch((error) => {
        logger.error(
          'SESSIONS',
          `Unexpected ${context} cleanup error`,
          undefined,
          normalizeUnknownError(error),
        );
      });
      return;
    }

    setActiveSessionId(null);

    storage.saveActiveSession(null).catch((error) => {
      logger.error(
        'SESSIONS',
        `Failed to clear active session after ${context}`,
        undefined,
        normalizeUnknownError(error),
      );
    });

    storage.appendCompletionHistory(record).catch((error) => {
      logger.error(
        'SESSIONS',
        `Failed to persist completion history after ${context}`,
        undefined,
        normalizeUnknownError(error),
      );
    });
  }

  const completeSession = (
    description?: string,
    notes?: string,
    overrides?: CompletionOverrides,
  ) => {
    const currentState = readState();
    const activeSession = currentState.activeSession;
    if (!activeSession) return;

    const chain = currentState.chains.find(
      (item) => item.id === activeSession.chainId,
    );
    if (!chain) return;

    const actualDuration =
      overrides?.actualDuration ?? computeActualDuration(activeSession, chain);

    const completedAt = overrides?.completedAt ?? new Date();
    const newStreak = chain.currentStreak + 1;
    notifyTaskCompleted(chain.name, newStreak);

    const completionRecord: CompletionHistory = {
      id: createCompletionHistoryId(),
      chainId: chain.id,
      startedAt: activeSession.startedAt,
      completedAt,
      duration: activeSession.duration,
      wasSuccessful: true,
      actualDuration,
      isForwardTimed: Boolean(chain.isDurationless),
      description,
      notes,
    };

    const updatedHistory = [
      ...currentState.completionHistory,
      completionRecord,
    ];

    let updatedChains = updateChainsForSuccess(
      currentState.chains,
      chain.id,
      completedAt,
    );
    const groupCycleResult = maybeIncrementGroupCycleCompletion(
      updatedChains,
      chain,
      tr,
      currentState.chainsRevision + 1,
    );
    updatedChains = groupCycleResult.updatedChains;

    const dailyPlanItemId = resolveDailyPlanItemId(currentState, activeSession);
    const updatedDailyPlans = dailyPlanItemId
      ? currentState.dailyPlans.map((plan) =>
          plan.items.some((item) => item.id === dailyPlanItemId)
            ? setPlanItemStatus(
                plan,
                dailyPlanItemId,
                'completed',
                completedAt,
                completionRecord.id,
              )
            : plan,
        )
      : currentState.dailyPlans;

    persistChains(updatedChains, '完成任务时保存链条数据失败');
    if (updatedDailyPlans !== currentState.dailyPlans) {
      storage.saveDailyPlans(updatedDailyPlans).catch((error) => {
        logger.error(
          'SESSIONS',
          '完成任务时保存今日计划失败',
          undefined,
          normalizeUnknownError(error),
        );
      });
    }
    persistCompletionHistoryAndCleanup(completionRecord, 'completion');

    if (completionRecord.actualDuration) {
      storage
        .updateTaskTimeStats(chain.id, completionRecord.actualDuration)
        .catch((error) => {
          logger.error(
            'SESSIONS',
            'Failed to update task time stats after completion',
            { chainId: chain.id },
            normalizeUnknownError(error),
          );
        });
    }

    if (onPetTaskCompleted && actualDuration) {
      onPetTaskCompleted(actualDuration, true);
    }

    publishTaskLifecycleEvent({
      type: 'task_completed',
      chainId: chain.id,
      chainKind: chain.type === 'group' ? 'group' : 'unit',
      occurredAt: completedAt,
    });

    if (groupCycleResult.completedGroupId) {
      publishTaskLifecycleEvent({
        type: 'group_cycle_completed',
        chainId: groupCycleResult.completedGroupId,
        chainKind: 'group',
        occurredAt: completedAt,
      });
    }

    setState((prev) => ({
      ...prev,
      chains: updatedChains,
      chainsRevision: prev.chainsRevision + 1,
      dailyPlans: updatedDailyPlans,
      activeSession: null,
      completionHistory: updatedHistory,
    }));
    onNavigateToDashboard?.();
  };

  const handleCompleteSession = (description?: string, notes?: string) => {
    completeSession(description, notes);
  };

  const handleAutoCompleteSession = (
    completedAt: Date,
    actualDuration: number,
  ) => {
    completeSession(undefined, undefined, { completedAt, actualDuration });
  };

  const handleInterruptSession = (reason?: string) => {
    const currentState = readState();
    const activeSession = currentState.activeSession;
    if (!activeSession) return;

    const chain = currentState.chains.find(
      (item) => item.id === activeSession.chainId,
    );
    if (!chain) return;

    if (chain.isDurationless) {
      const sessionId = `${activeSession.chainId}_${activeSession.startedAt.getTime()}`;
      forwardTimerManager.clearTimer(sessionId);
    }

    const completionRecord: CompletionHistory = {
      id: createCompletionHistoryId(),
      chainId: chain.id,
      startedAt: activeSession.startedAt,
      completedAt: new Date(),
      duration: activeSession.duration,
      wasSuccessful: false,
      reasonForFailure: reason || '用户主动中断',
      actualDuration: activeSession.duration,
      isForwardTimed: Boolean(chain.isDurationless),
    };

    const updatedHistory = [
      ...currentState.completionHistory,
      completionRecord,
    ];

    let updatedChains = updateChainsForFailure(currentState.chains, chain.id);
    if (chain.parentId && chain.type !== 'group') {
      logger.debug(
        'SESSIONS',
        `任务 ${chain.name} 失败/中断，重置任务群完成计数`,
      );
      updatedChains = resetGroupCompletionCount(updatedChains, chain.parentId);
    }

    persistChains(updatedChains, '中断任务时保存链条数据失败');
    persistCompletionHistoryAndCleanup(completionRecord, 'interrupt');

    publishTaskLifecycleEvent({
      type: 'task_interrupted',
      chainId: chain.id,
      chainKind: chain.type === 'group' ? 'group' : 'unit',
      occurredAt: completionRecord.completedAt,
    });

    setState((prev) => ({
      ...prev,
      chains: updatedChains,
      chainsRevision: prev.chainsRevision + 1,
      activeSession: null,
      completionHistory: updatedHistory,
    }));
    onNavigateToDashboard?.();
  };

  return {
    handleCompleteSession,
    handleAutoCompleteSession,
    handleInterruptSession,
  };
}
