/**
 * @module useSessionsDomain
 * @description 任务会话生命周期管理的领域 Hook
 *
 * 职责：
 * - 预约任务（ScheduledSession）
 * - 开始/完成/中断/暂停/恢复任务会话
 * - 处理任务群（Group）的循环执行逻辑
 * - 集成赌注模式（Betting）和宠物系统（Pet）
 * - 记录完成历史和时间统计
 *
 * @see docs/guides/ARCHITECTURE.md - 架构总览
 * @see docs/features/DOMAIN_BETTING.md - 赌注系统集成
 */
import type { Dispatch, SetStateAction } from 'react';
import type { ActiveSession, AppState, CompletionHistory, ScheduledSession } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import type { SafelySaveChains } from './useChainsDomain';
import { isGroupExpired, resetGroupProgress, startGroupTimer } from '../../utils/timeLimit';
import { queryOptimizer } from '../../utils/queryOptimizer';
import {
  getNextUnitInGroup,
  incrementGroupCompletionCount,
  isGroupFullyCompleted,
  resetGroupCompletionCount,
} from '../../utils/chainTree';
import { notificationManager } from '../../utils/notifications';
import { forwardTimerManager } from '../../utils/forwardTimer';
import { logger } from '../../utils/logger';
import { toast } from '../../utils/toast';
import { emitPointsChanged } from '../../utils/pointsEvents';
import { useI18n } from '../../i18n';

interface UseSessionsDomainParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  safelySaveChains: SafelySaveChains;

  activeSessionId: string | null;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;

  pendingChainId: string | null;
  setPendingChainId: Dispatch<SetStateAction<string | null>>;
  currentSessionId: string | null;
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>;
  setShowBettingModal: Dispatch<SetStateAction<boolean>>;

  setShowAuxiliaryJudgment: Dispatch<SetStateAction<string | null>>;

  // Pet system callback (optional)
  onPetTaskCompleted?: (duration: number, wasSuccessful: boolean) => void;
}

export function useSessionsDomain({
  state,
  setState,
  storage,
  safelySaveChains,
  activeSessionId,
  setActiveSessionId,
  pendingChainId,
  setPendingChainId,
  currentSessionId,
  setCurrentSessionId,
  setShowBettingModal,
  setShowAuxiliaryJudgment,
  onPetTaskCompleted,
}: UseSessionsDomainParams) {
  const { tr } = useI18n();
  const handleScheduleChain = (chainId: string) => {
    const existingSchedule = state.scheduledSessions.find(s => s.chainId === chainId);
    if (existingSchedule) return;

    const chain = state.chains.find(c => c.id === chainId);
    if (!chain) return;

    const scheduledSession: ScheduledSession = {
      chainId,
      scheduledAt: new Date(),
      expiresAt: new Date(Date.now() + chain.auxiliaryDuration * 60 * 1000),
      auxiliarySignal: chain.auxiliarySignal,
    };

    const updateStateAndSave = async () => {
      try {
        const updatedSessions = [...state.scheduledSessions, scheduledSession];

        const updatedChains = state.chains.map(chain =>
          chain.id === chainId ? { ...chain, auxiliaryStreak: chain.auxiliaryStreak + 1 } : chain
        );

        await Promise.all([storage.saveScheduledSessions(updatedSessions), safelySaveChains(updatedChains)]);
        queryOptimizer.onDataChange('chains');

        setState(prev => ({
          ...prev,
          scheduledSessions: updatedSessions,
          chains: updatedChains,
        }));
      } catch (error) {
        logger.error('SESSIONS', 'Failed to schedule chain', { chainId }, error as Error);
        toast.error(tr('预约失败，请重试', 'Failed to schedule. Please try again.'));
      }
    };

    updateStateAndSave();
  };

  const handleStartChain = async (chainId: string) => {
    if (storage.kind === 'supabase' && !pendingChainId) {
      try {
        const isGamblingEnabled = await storage.isGamblingModeEnabled();
        if (isGamblingEnabled.ok && isGamblingEnabled.value) {
          const chain = state.chains.find(c => c.id === chainId);
          if (!chain) return;

          const sessionId = await storage.createBettingSession(chainId, chain.duration);
          if (!sessionId.ok) {
            logger.error('SESSIONS', 'Failed to create betting session', {
              chainId,
              code: sessionId.error.code,
              message: sessionId.error.message,
            });
            toast.error(
              tr(
                '无法创建押注会话：数据库可能处于只读状态（查看控制台）',
                'Failed to create betting session: database may be read-only (check console).'
              )
            );
            return;
          }

          setPendingChainId(chainId);
          setCurrentSessionId(sessionId.value);
          setShowBettingModal(true);
          return;
        }
      } catch (error) {
        logger.error('SESSIONS', 'Failed to check gambling mode', undefined, error as Error);
      }
    }

    const chain = state.chains.find(c => c.id === chainId);
    if (!chain) return;

    const existingScheduledSession = state.scheduledSessions.find(session => session.chainId === chainId);

    if (chain.type === 'group') {
      if (isGroupExpired(chain)) {
        const updatedChains = state.chains.map(c => (c.id === chainId ? resetGroupProgress(c) : c));

        setState(prev => ({
          ...prev,
          chains: updatedChains,
        }));

        notificationManager.notifyTaskFailed(chain.name, tr('任务群已超时', 'Group has expired'));
        return;
      }

      if (chain.timeLimitHours && !chain.groupStartedAt) {
        const updatedChains = state.chains.map(c => (c.id === chainId ? startGroupTimer(c) : c));

        setState(prev => ({
          ...prev,
          chains: updatedChains,
        }));
      }

      const chainTree = queryOptimizer.memoizedBuildChainTree(state.chains);
      const groupNode = chainTree.find(node => node.id === chainId);
      if (groupNode) {
        const nextUnit = getNextUnitInGroup(groupNode);
        if (nextUnit) {
          logger.debug('SESSIONS', `任务群 ${chain.name} 开始下一个任务: ${nextUnit.name}`);
          await handleStartChain(nextUnit.id);
          return;
        }

        logger.debug('SESSIONS', `任务群 ${chain.name} 所有子任务已完成，开始新一轮循环`);

        const updatedChains = incrementGroupCompletionCount(state.chains, chainId);
        const updatedGroup = updatedChains.find(c => c.id === chainId);

        if (updatedGroup) {
          notificationManager.notifyTaskCompleted(
            updatedGroup.name,
            updatedGroup.totalCompletions,
            tr(
              `第${updatedGroup.totalCompletions}轮已完成，正在开始第${updatedGroup.totalCompletions + 1}轮`,
              `Cycle ${updatedGroup.totalCompletions} completed. Starting cycle ${updatedGroup.totalCompletions + 1}.`
            )
          );
        }

        try {
          await safelySaveChains(updatedChains);
          queryOptimizer.onDataChange('chains');
          setState(prev => ({ ...prev, chains: updatedChains }));

          setTimeout(async () => {
            const freshChains = await storage.getActiveChains();
            const newTree = queryOptimizer.memoizedBuildChainTree(freshChains);
            const newGroupNode = newTree.find(n => n.id === chainId);

            const firstUnit = newGroupNode ? getNextUnitInGroup(newGroupNode) : null;
            if (firstUnit) {
              logger.debug(
                'SESSIONS',
                `任务群 ${chain.name} 开始新一轮（第${(updatedGroup?.totalCompletions ?? 0) + 1}轮），从 ${firstUnit.name} 开始`
              );
              await handleStartChain(firstUnit.id);
            }
          }, 100);
        } catch (e) {
          logger.error('SESSIONS', '保存任务群完成计数失败', undefined, e as Error);
        }

        return;
      }

      logger.error('SESSIONS', '无法找到任务群节点', { chainId });
      return;
    }

    const bettingSessionId = pendingChainId === chainId ? currentSessionId : null;

    const activeSession: ActiveSession = {
      ...(bettingSessionId ? { id: bettingSessionId } : {}),
      chainId,
      startedAt: new Date(),
      duration: chain.isDurationless ? 0 : chain.duration,
      isPaused: false,
      totalPausedTime: 0,
    };

    const updatedScheduledSessions = state.scheduledSessions.filter(session => session.chainId !== chainId);

    let updatedChains = state.chains;
    if (existingScheduledSession) {
      updatedChains = state.chains.map(c =>
        c.id === chainId ? { ...c, auxiliaryStreak: c.auxiliaryStreak + 1 } : c
      );

      notificationManager.notifyTaskCompleted(chain.name, chain.auxiliaryStreak + 1, tr('预约已完成', 'Schedule completed'));
    }

    void storage.saveActiveSession(activeSession).catch(error => {
      logger.error('SESSIONS', 'Failed to persist active session', { chainId }, error as Error);
      toast.error(
        tr(
          '无法保存任务会话：数据库可能处于只读状态或写入被拒绝（查看控制台）',
          'Failed to persist session: database may be read-only or write is denied (check console).'
        )
      );
    });
    void storage.saveScheduledSessions(updatedScheduledSessions).catch(error => {
      logger.error('SESSIONS', 'Failed to persist scheduled sessions', { chainId }, error as Error);
    });

    if (existingScheduledSession) {
      safelySaveChains(updatedChains).catch(error => {
        queryOptimizer.onDataChange('chains');
        logger.error('SESSIONS', '开始任务时保存链条数据失败', undefined, error as Error);
      });
    }

    setState(prev => ({
      ...prev,
      activeSession,
      scheduledSessions: updatedScheduledSessions,
      chains: updatedChains,
      currentView: 'focus',
    }));
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

      if (groupNode && groupNode.type === 'group') {
        if (isGroupFullyCompleted(groupNode)) {
          logger.debug('SESSIONS', `任务群 ${groupNode.name} 已完成所有任务，增加完成计数`);
          updatedChains = incrementGroupCompletionCount(updatedChains, chain.parentId);

          const parentChain = updatedChains.find(c => c.id === chain.parentId);
          if (parentChain) {
            notificationManager.notifyTaskCompleted(
              parentChain.name,
              parentChain.currentStreak,
              tr('任务群完成一轮', 'Group completed a cycle')
            );
          }
        }
      }
    }

    const updatedHistory = [...state.completionHistory, completionRecord];

    safelySaveChains(updatedChains).catch(error => {
      queryOptimizer.onDataChange('chains');
      logger.error('SESSIONS', '完成任务时保存链条数据失败', undefined, error as Error);
    });

    if (activeSessionId && storage.kind === 'supabase') {
      void (async () => {
        try {
          await storage.saveCompletionHistory(updatedHistory);
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
    } else {
      setActiveSessionId(null);

      void storage.saveActiveSession(null).catch(error => {
        logger.error('SESSIONS', 'Failed to clear active session after completion', undefined, error as Error);
      });

      void storage.saveCompletionHistory(updatedHistory).catch(error => {
        logger.error('SESSIONS', 'Failed to persist completion history after completion', undefined, error as Error);
      });
    }

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

    safelySaveChains(updatedChains).catch(error => {
      queryOptimizer.onDataChange('chains');
      logger.error('SESSIONS', '中断任务时保存链条数据失败', undefined, error as Error);
    });

    if (activeSessionId && storage.kind === 'supabase') {
      void (async () => {
        try {
          await storage.saveCompletionHistory(updatedHistory);
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

      void storage.saveCompletionHistory(updatedHistory).catch(error => {
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

  const handlePauseSession = () => {
    const activeSession = state.activeSession;
    if (!activeSession) return;

    const updatedSession = {
      ...activeSession,
      isPaused: true,
      pausedAt: new Date(),
    };

    void storage.saveActiveSession(updatedSession).catch(error => {
      logger.error('SESSIONS', 'Failed to persist paused session', undefined, error as Error);
    });

    setState(prev => ({
      ...prev,
      activeSession: updatedSession,
    }));
  };

  const handleResumeSession = () => {
    const activeSession = state.activeSession;
    if (!activeSession || !activeSession.pausedAt) return;

    const pauseDuration = Date.now() - activeSession.pausedAt.getTime();
    const updatedSession = {
      ...activeSession,
      isPaused: false,
      pausedAt: undefined,
      totalPausedTime: activeSession.totalPausedTime + pauseDuration,
    };

    void storage.saveActiveSession(updatedSession).catch(error => {
      logger.error('SESSIONS', 'Failed to persist resumed session', undefined, error as Error);
    });

    setState(prev => ({
      ...prev,
      activeSession: updatedSession,
    }));
  };

  const handleCancelScheduledSession = (chainId: string) => {
    setShowAuxiliaryJudgment(chainId);
  };

  const handleCompleteBooking = (chainId: string) => {
    const chain = state.chains.find(c => c.id === chainId);
    if (!chain) return;

    const updatedScheduledSessions = state.scheduledSessions.filter(session => session.chainId !== chainId);
    const updatedChains = state.chains.map(c =>
      c.id === chainId ? { ...c, auxiliaryStreak: c.auxiliaryStreak + 1 } : c
    );

    void storage.saveScheduledSessions(updatedScheduledSessions).catch(error => {
      logger.error('SESSIONS', 'Failed to persist scheduled sessions after completing booking', { chainId }, error as Error);
    });
    safelySaveChains(updatedChains).catch(error => {
      queryOptimizer.onDataChange('chains');
      logger.error('SESSIONS', '完成预约时保存链条数据失败', undefined, error as Error);
    });

    setState(prev => ({
      ...prev,
      scheduledSessions: updatedScheduledSessions,
      chains: updatedChains,
    }));

    notificationManager.notifyTaskCompleted(chain.name, chain.auxiliaryStreak + 1, tr('预约已完成', 'Schedule completed'));
  };

  return {
    handleScheduleChain,
    handleStartChain,
    handleCompleteSession,
    handleInterruptSession,
    handlePauseSession,
    handleResumeSession,
    handleCancelScheduledSession,
    handleCompleteBooking,
  };
}
