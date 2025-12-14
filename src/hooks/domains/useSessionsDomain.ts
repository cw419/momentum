import type { Dispatch, SetStateAction } from 'react';
import type { ActiveSession, AppState, CompletionHistory, ScheduledSession } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import type { SafelySaveChains } from './useChainsDomain';
import { UserSettingsService } from '../../services/UserSettingsService';
import { SessionService } from '../../services/SessionService';
import { isSupabaseConfigured } from '../../lib/supabase';
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

interface UseSessionsDomainParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  safelySaveChains: SafelySaveChains;

  activeSessionId: string | null;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;

  pendingChainId: string | null;
  setPendingChainId: Dispatch<SetStateAction<string | null>>;
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>;
  setShowBettingModal: Dispatch<SetStateAction<boolean>>;

  setShowAuxiliaryJudgment: Dispatch<SetStateAction<string | null>>;
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
  setCurrentSessionId,
  setShowBettingModal,
  setShowAuxiliaryJudgment,
}: UseSessionsDomainParams) {
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
        console.error('Failed to schedule chain:', error);
        alert('预约失败，请重试');
      }
    };

    updateStateAndSave();
  };

  const handleStartChain = async (chainId: string) => {
    if (isSupabaseConfigured && !pendingChainId) {
      try {
        const isGamblingEnabled = await UserSettingsService.isGamblingModeEnabled();
        if (isGamblingEnabled) {
          const chain = state.chains.find(c => c.id === chainId);
          if (!chain) return;

          const sessionId = await SessionService.createActiveSession(chainId, chain.duration);

          setPendingChainId(chainId);
          setCurrentSessionId(sessionId);
          setShowBettingModal(true);
          return;
        }
      } catch (error) {
        console.error('Failed to check gambling mode:', error);
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

        notificationManager.notifyTaskFailed(chain.name, '任务群已超时');
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
          console.log(`任务群 ${chain.name} 开始下一个任务: ${nextUnit.name}`);
          await handleStartChain(nextUnit.id);
          return;
        }

        console.log(`任务群 ${chain.name} 所有子任务已完成，开始新一轮循环`);

        const updatedChains = incrementGroupCompletionCount(state.chains, chainId);
        const updatedGroup = updatedChains.find(c => c.id === chainId);

        if (updatedGroup) {
          notificationManager.notifyTaskCompleted(
            `${updatedGroup.name} (任务群)`,
            updatedGroup.totalCompletions,
            `第${updatedGroup.totalCompletions}轮已完成，正在开始第${updatedGroup.totalCompletions + 1}轮`
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
              console.log(
                `任务群 ${chain.name} 开始新一轮（第${(updatedGroup?.totalCompletions ?? 0) + 1}轮），从 ${firstUnit.name} 开始`
              );
              await handleStartChain(firstUnit.id);
            }
          }, 100);
        } catch (e) {
          console.error('保存任务群完成计数失败:', e);
        }

        return;
      }

      console.error(`无法找到任务群节点: ${chainId}`);
      return;
    }

    const activeSession: ActiveSession = {
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

      notificationManager.notifyTaskCompleted(`${chain.name} (预约)`, chain.auxiliaryStreak + 1, '预约已完成');
    }

    setState(prev => {
      storage.saveActiveSession(activeSession);
      storage.saveScheduledSessions(updatedScheduledSessions);

      if (existingScheduledSession) {
        safelySaveChains(updatedChains).catch(error => {
          queryOptimizer.onDataChange('chains');
          console.error('开始任务时保存链条数据失败:', error);
        });
      }

      return {
        ...prev,
        activeSession,
        scheduledSessions: updatedScheduledSessions,
        chains: updatedChains,
        currentView: 'focus',
      };
    });
  };

  const handleCompleteSession = (description?: string, notes?: string) => {
    if (!state.activeSession) return;

    const chain = state.chains.find(c => c.id === state.activeSession!.chainId);
    if (!chain) return;

    let actualDuration = state.activeSession.duration;

    if (chain.isDurationless) {
      const sessionId = `${state.activeSession.chainId}_${state.activeSession.startedAt.getTime()}`;
      const elapsedSeconds = forwardTimerManager.stopTimer(sessionId);
      actualDuration = Math.ceil(elapsedSeconds / 60);
    }

    const newStreak = chain.currentStreak + 1;
    notificationManager.notifyTaskCompleted(chain.name, newStreak);

    const completionRecord: CompletionHistory = {
      chainId: chain.id,
      completedAt: new Date(),
      duration: state.activeSession.duration,
      wasSuccessful: true,
      actualDuration: actualDuration,
      isForwardTimed: !!chain.isDurationless,
      description: description,
      notes: notes,
    };

    setState(prev => {
      let updatedChains = prev.chains.map(c =>
        c.id === chain.id
          ? {
              ...c,
              currentStreak: c.currentStreak + 1,
              totalCompletions: c.totalCompletions + 1,
              lastCompletedAt: new Date(),
            }
          : c
      );

      if (chain.parentId && chain.type !== 'group') {
        const chainTree = queryOptimizer.memoizedBuildChainTree(updatedChains);
        const groupNode = chainTree.find(node => node.id === chain.parentId);

        if (groupNode && groupNode.type === 'group') {
          if (isGroupFullyCompleted(groupNode)) {
            console.log(`任务群 ${groupNode.name} 已完成所有任务，增加完成计数`);
            updatedChains = incrementGroupCompletionCount(updatedChains, chain.parentId);

            const parentChain = updatedChains.find(c => c.id === chain.parentId);
            if (parentChain) {
              notificationManager.notifyTaskCompleted(
                `${parentChain.name} (任务群)`,
                parentChain.currentStreak,
                '任务群完成一轮'
              );
            }
          }
        }
      }

      const updatedHistory = [...prev.completionHistory, completionRecord];

      safelySaveChains(updatedChains).catch(error => {
        queryOptimizer.onDataChange('chains');
        console.error('完成任务时保存链条数据失败:', error);
      });
      storage.saveActiveSession(null);

      if (activeSessionId && isSupabaseConfigured) {
        SessionService.completeTaskWithBetting(activeSessionId, true, '任务完成')
          .then(result => {
            console.log('任务完成和押注结算成功:', result);
            setActiveSessionId(null);
          })
          .catch(error => {
            console.error('完成任务和押注结算失败:', error);
            storage.saveCompletionHistory(updatedHistory);
          });
      } else {
        storage.saveCompletionHistory(updatedHistory);
      }

      if (completionRecord.actualDuration) {
        storage.updateTaskTimeStats(chain.id, completionRecord.actualDuration);
      }

      return {
        ...prev,
        chains: updatedChains,
        activeSession: null,
        completionHistory: updatedHistory,
        currentView: 'dashboard',
      };
    });
  };

  const handleInterruptSession = (reason?: string) => {
    if (!state.activeSession) return;

    const chain = state.chains.find(c => c.id === state.activeSession!.chainId);
    if (!chain) return;

    if (chain.isDurationless) {
      const sessionId = `${state.activeSession.chainId}_${state.activeSession.startedAt.getTime()}`;
      forwardTimerManager.clearTimer(sessionId);
    }

    const completionRecord: CompletionHistory = {
      chainId: chain.id,
      completedAt: new Date(),
      duration: state.activeSession.duration,
      wasSuccessful: false,
      reasonForFailure: reason || '用户主动中断',
      actualDuration: state.activeSession.duration,
      isForwardTimed: !!chain.isDurationless,
    };

    setState(prev => {
      let updatedChains = prev.chains.map(c =>
        c.id === chain.id
          ? {
              ...c,
              currentStreak: 0,
              totalFailures: c.totalFailures + 1,
            }
          : c
      );

      if (chain.parentId && chain.type !== 'group') {
        console.log(`任务 ${chain.name} 失败/中断，重置任务群完成计数`);
        updatedChains = resetGroupCompletionCount(updatedChains, chain.parentId);
      }

      const updatedHistory = [...prev.completionHistory, completionRecord];

      safelySaveChains(updatedChains).catch(error => {
        queryOptimizer.onDataChange('chains');
        console.error('中断任务时保存链条数据失败:', error);
      });
      storage.saveActiveSession(null);

      if (activeSessionId && isSupabaseConfigured) {
        SessionService.completeTaskWithBetting(activeSessionId, false, '任务中断或失败')
          .then(result => {
            console.log('任务中断/失败和押注结算成功:', result);
            setActiveSessionId(null);
          })
          .catch(error => {
            console.error('中断任务和押注结算失败:', error);
            storage.saveCompletionHistory(updatedHistory);
          });
      } else {
        storage.saveCompletionHistory(updatedHistory);
      }

      return {
        ...prev,
        chains: updatedChains,
        activeSession: null,
        completionHistory: updatedHistory,
        currentView: 'dashboard',
      };
    });
  };

  const handlePauseSession = () => {
    if (!state.activeSession) return;

    setState(prev => {
      const updatedSession = {
        ...prev.activeSession!,
        isPaused: true,
        pausedAt: new Date(),
      };

      storage.saveActiveSession(updatedSession);

      return {
        ...prev,
        activeSession: updatedSession,
      };
    });
  };

  const handleResumeSession = () => {
    if (!state.activeSession || !state.activeSession.pausedAt) return;

    setState(prev => {
      const pauseDuration = Date.now() - prev.activeSession!.pausedAt!.getTime();
      const updatedSession = {
        ...prev.activeSession!,
        isPaused: false,
        pausedAt: undefined,
        totalPausedTime: prev.activeSession!.totalPausedTime + pauseDuration,
      };

      storage.saveActiveSession(updatedSession);

      return {
        ...prev,
        activeSession: updatedSession,
      };
    });
  };

  const handleCancelScheduledSession = (chainId: string) => {
    setShowAuxiliaryJudgment(chainId);
  };

  const handleCompleteBooking = (chainId: string) => {
    setState(prev => {
      const updatedScheduledSessions = prev.scheduledSessions.filter(session => session.chainId !== chainId);

      const updatedChains = prev.chains.map(chain =>
        chain.id === chainId ? { ...chain, auxiliaryStreak: chain.auxiliaryStreak + 1 } : chain
      );

      storage.saveScheduledSessions(updatedScheduledSessions);
      safelySaveChains(updatedChains).catch(error => {
        queryOptimizer.onDataChange('chains');
        console.error('完成预约时保存链条数据失败:', error);
      });

      return {
        ...prev,
        scheduledSessions: updatedScheduledSessions,
        chains: updatedChains,
      };
    });

    const chain = state.chains.find(c => c.id === chainId);
    if (chain) {
      notificationManager.notifyTaskCompleted(`${chain.name} (预约)`, chain.auxiliaryStreak + 1, '预约已完成');
    }
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
