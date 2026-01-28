import type { Dispatch, SetStateAction } from 'react';
import type { AppState, CompletionHistory } from '../../../types';
import type { MomentumStorage } from '../../../storage/MomentumStorage';
import type { SafelySaveChains } from '../useChainsDomain';
import { queryOptimizer } from '../../../utils/queryOptimizer';
import {
  incrementGroupCompletionCount,
  isGroupFullyCompleted,
  resetGroupCompletionCount,
} from '../../../utils/chainTree';
import { notificationManager } from '../../../utils/notifications';
import { forwardTimerManager } from '../../../utils/forwardTimer';
import { logger } from '../../../utils/logger';
import { emitPointsChanged } from '../../../utils/pointsEvents';

interface CreateCompletionHandlersParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  safelySaveChains: SafelySaveChains;
  activeSessionId: string | null;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  onPetTaskCompleted?: (duration: number, wasSuccessful: boolean) => void;
  tr: (zh: string, en: string) => string;
}

export function createCompletionHandlers({
  state,
  setState,
  storage,
  safelySaveChains,
  activeSessionId,
  setActiveSessionId,
  onPetTaskCompleted,
  tr,
}: CreateCompletionHandlersParams) {
  const persistCompletionAndClearActiveSession = (historyToPersist: CompletionHistory[]) => {
    if (activeSessionId && storage.kind === 'supabase') {
      void (async () => {
        try {
          await storage.saveCompletionHistory(historyToPersist);
        } catch (error) {
          logger.error('SESSIONS', 'Failed to persist completion history after completion', undefined, error as Error);
        } finally {
          setActiveSessionId(null);
          try {
            await storage.saveActiveSession(null);
          } catch (error) {
            logger.error('SESSIONS', 'Failed to clear active session after completion', undefined, error as Error);
          } finally {
            emitPointsChanged();
          }
        }
      })();
      return;
    }

    setActiveSessionId(null);

    void storage.saveActiveSession(null).catch(error => {
      logger.error('SESSIONS', 'Failed to clear active session after completion', undefined, error as Error);
    });

    void storage.saveCompletionHistory(historyToPersist).catch(error => {
      logger.error('SESSIONS', 'Failed to persist completion history after completion', undefined, error as Error);
    });
  };

  const handleCompleteSession = (description?: string, notes?: string) => {
    const activeSession = state.activeSession;
    if (!activeSession) return;

    const chain = state.chains.find(c => c.id === activeSession.chainId);
    if (!chain) return;

    let actualDuration = activeSession.duration;

    if (chain.isDurationless) {
      const sessionId = `${activeSession.chainId}_${activeSession.startedAt.getTime()}`;
      const elapsedSeconds = forwardTimerManager.stopTimer(sessionId);
      actualDuration = Math.ceil(elapsedSeconds / 60);
    }

    const completedAt = new Date();
    const newStreak = chain.currentStreak + 1;
    notificationManager.notifyTaskCompleted(chain.name, newStreak);

    const completionRecord: CompletionHistory = {
      chainId: chain.id,
      completedAt,
      duration: activeSession.duration,
      wasSuccessful: true,
      actualDuration,
      isForwardTimed: !!chain.isDurationless,
      description,
      notes,
    };

    let updatedChains = state.chains.map(c =>
      c.id === chain.id
        ? {
            ...c,
            currentStreak: c.currentStreak + 1,
            totalCompletions: c.totalCompletions + 1,
            lastCompletedAt: completedAt,
          }
        : c
    );

    if (chain.parentId && chain.type !== 'group') {
      const chainTree = queryOptimizer.memoizedBuildChainTree(updatedChains);
      const groupNode = chainTree.find(node => node.id === chain.parentId);

      if (groupNode && groupNode.type === 'group' && isGroupFullyCompleted(groupNode)) {
        logger.debug('SESSIONS', `任务群 ${groupNode.name} 已完成所有任务，增加完成计数`);
        updatedChains = incrementGroupCompletionCount(updatedChains, chain.parentId);

        const parentChain = updatedChains.find(c => c.id === chain.parentId);
        if (parentChain) {
          notificationManager.notifyTaskCompleted(parentChain.name, parentChain.currentStreak, tr('任务群完成一轮', 'Group completed a cycle'));
        }
      }
    }

    const updatedHistory = [...state.completionHistory, completionRecord];
    const historyToPersist = storage.kind === 'supabase' ? [completionRecord] : updatedHistory;

    safelySaveChains(updatedChains).catch(error => {
      queryOptimizer.onDataChange('chains');
      logger.error('SESSIONS', '完成任务时保存链条数据失败', undefined, error as Error);
    });

    persistCompletionAndClearActiveSession(historyToPersist);

    if (completionRecord.actualDuration) {
      void storage.updateTaskTimeStats(chain.id, completionRecord.actualDuration).catch(error => {
        logger.error('SESSIONS', 'Failed to update task time stats after completion', { chainId: chain.id }, error as Error);
      });
    }

    // Notify pet system of task completion
    if (onPetTaskCompleted && actualDuration) {
      onPetTaskCompleted(actualDuration, true);
    }

    setState(prev => ({
      ...prev,
      chains: updatedChains,
      activeSession: null,
      completionHistory: updatedHistory,
      currentView: 'dashboard',
    }));
  };

  const handleInterruptSession = (reason?: string) => {
    const activeSession = state.activeSession;
    if (!activeSession) return;

    const chain = state.chains.find(c => c.id === activeSession.chainId);
    if (!chain) return;

    if (chain.isDurationless) {
      const sessionId = `${activeSession.chainId}_${activeSession.startedAt.getTime()}`;
      forwardTimerManager.clearTimer(sessionId);
    }

    const completionRecord: CompletionHistory = {
      chainId: chain.id,
      completedAt: new Date(),
      duration: activeSession.duration,
      wasSuccessful: false,
      reasonForFailure: reason || '用户主动中断',
      actualDuration: activeSession.duration,
      isForwardTimed: !!chain.isDurationless,
    };

    let updatedChains = state.chains.map(c =>
      c.id === chain.id
        ? {
            ...c,
            currentStreak: 0,
            totalFailures: c.totalFailures + 1,
          }
        : c
    );

    if (chain.parentId && chain.type !== 'group') {
      logger.debug('SESSIONS', `任务 ${chain.name} 失败/中断，重置任务群完成计数`);
      updatedChains = resetGroupCompletionCount(updatedChains, chain.parentId);
    }

    const updatedHistory = [...state.completionHistory, completionRecord];
    const historyToPersist = storage.kind === 'supabase' ? [completionRecord] : updatedHistory;

    safelySaveChains(updatedChains).catch(error => {
      queryOptimizer.onDataChange('chains');
      logger.error('SESSIONS', '中断任务时保存链条数据失败', undefined, error as Error);
    });

    if (activeSessionId && storage.kind === 'supabase') {
      void (async () => {
        try {
          await storage.saveCompletionHistory(historyToPersist);
        } catch (error) {
          logger.error('SESSIONS', 'Failed to persist completion history after interrupt', undefined, error as Error);
        } finally {
          setActiveSessionId(null);
          try {
            await storage.saveActiveSession(null);
          } catch (error) {
            logger.error('SESSIONS', 'Failed to clear active session after interrupt', undefined, error as Error);
          } finally {
            emitPointsChanged();
          }
        }
      })();
    } else {
      setActiveSessionId(null);

      void storage.saveActiveSession(null).catch(error => {
        logger.error('SESSIONS', 'Failed to clear active session after interrupt', undefined, error as Error);
      });

      void storage.saveCompletionHistory(historyToPersist).catch(error => {
        logger.error('SESSIONS', 'Failed to persist completion history after interrupt', undefined, error as Error);
      });
    }

    setState(prev => ({
      ...prev,
      chains: updatedChains,
      activeSession: null,
      completionHistory: updatedHistory,
      currentView: 'dashboard',
    }));
  };

  return { handleCompleteSession, handleInterruptSession };
}
