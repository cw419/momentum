/**
 * @module useSessionsDomain
 * @description 任务会话生命周期管理的领域 Hook
 *
 * 职责：
 * - 预约任务（ScheduledSession）
 * - 开始/完成/中断/暂停/恢复任务会话
 * - 处理任务群（Group）的循环执行逻辑
 * - 集成赌博模式（Betting）和宠物系统（Pet）
 * - 记录完成历史和时间统计
 *
 * @see docs/guides/ARCHITECTURE.md - 架构总览
 * @see docs/features/DOMAIN_BETTING.md - 赌博系统集成
 */
import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import type { SafelySaveChains } from './useChainsDomain';
import type { RSIPTaskEventPayload } from '../../services/rsip-integration/RSIPTaskIntegrationService';
import { useI18n } from '../../i18n';
import { createCompletionHandlers } from './sessions/completion';
import { createPauseResumeHandlers } from './sessions/pauseResume';
import { createSchedulingHandlers } from './sessions/scheduling';
import { createStartChainHandler } from './sessions/start';

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
  onRsipTaskEvent?: (payload: RSIPTaskEventPayload) => void | Promise<void>;
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
  onRsipTaskEvent,
}: UseSessionsDomainParams) {
  const { tr } = useI18n();

  const {
    handleScheduleChain,
    handleCancelScheduledSession,
    handleCompleteBooking,
  } = createSchedulingHandlers({
    state,
    setState,
    storage,
    safelySaveChains,
    setShowAuxiliaryJudgment,
    tr,
  });

  const handleStartChain = createStartChainHandler({
    state,
    setState,
    storage,
    safelySaveChains,
    pendingChainId,
    setPendingChainId,
    currentSessionId,
    setCurrentSessionId,
    setShowBettingModal,
    onRsipTaskEvent,
    tr,
  });

  const { handleCompleteSession, handleInterruptSession } =
    createCompletionHandlers({
      state,
      setState,
      storage,
      safelySaveChains,
      activeSessionId,
      setActiveSessionId,
      onPetTaskCompleted,
      onRsipTaskEvent,
      tr,
    });

  const { handlePauseSession, handleResumeSession } = createPauseResumeHandlers(
    { state, setState, storage },
  );

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
