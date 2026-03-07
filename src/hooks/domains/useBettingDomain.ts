/**
 * @module useBettingDomain
 * @description 赌注/博彩模式的领域 Hook
 *
 * 职责：
 * - 处理下注成功后的任务启动流程
 * - 处理取消下注后的会话清理
 *
 * 仅在 Supabase 模式下生效，本地模式不支持赌注功能。
 *
 * @see docs/features/DOMAIN_BETTING.md - 赌注系统完整文档
 * @see src/domain/betting.ts - 类型定义
 */
import type { Dispatch, SetStateAction } from 'react';
import type { BetPlacementResult } from '../../domain/betting';
import { useStorage } from '../../storage/useStorage';
import { hasStorageCapability } from '../../storage/ports';
import { logger } from '../../utils/logger';
import { toError } from '../../utils/errorMessage';
import { isDev } from '../../utils/env';
import { emitPointsChanged } from '../../utils/pointsEvents';

interface UseBettingDomainParams {
  pendingChainId: string | null;
  setPendingChainId: Dispatch<SetStateAction<string | null>>;

  currentSessionId: string | null;
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>;

  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  setShowBettingModal: Dispatch<SetStateAction<boolean>>;

  handleStartChain: (chainId: string) => Promise<void>;
}

export function useBettingDomain({
  pendingChainId,
  setPendingChainId,
  currentSessionId,
  setCurrentSessionId,
  setActiveSessionId,
  setShowBettingModal,
  handleStartChain,
}: UseBettingDomainParams) {
  const storage = useStorage();
  const canUseBetting = hasStorageCapability(storage, 'betting');

  const handleBetPlaced = async (betResult: BetPlacementResult) => {
    if (isDev) {
      logger.debug('BETTING', 'Bet placed successfully', { betResult });
    }

    emitPointsChanged();

    if (pendingChainId) {
      setActiveSessionId(currentSessionId);
      await handleStartChain(pendingChainId);
    }

    setPendingChainId(null);
    setCurrentSessionId(null);
    setShowBettingModal(false);
  };

  const handleBetCancelled = async () => {
    if (currentSessionId && canUseBetting) {
      try {
        const result = await storage.deleteBettingSession(currentSessionId);
        if (!result.ok) {
          logger.error('BETTING', 'Failed to delete cancelled session', {
            sessionId: currentSessionId,
            error: result.error,
          });
        }
        if (isDev) {
          logger.debug(
            'BETTING',
            'Cancelled session deleted (refund handled by trigger)',
            { sessionId: currentSessionId },
          );
        }
      } catch (error) {
        logger.error(
          'BETTING',
          '删除取消的会话记录失败',
          { sessionId: currentSessionId },
          toError(error),
        );
      }

      emitPointsChanged();
    }

    setPendingChainId(null);
    setCurrentSessionId(null);
    setActiveSessionId(null);
    setShowBettingModal(false);
  };

  return { handleBetPlaced, handleBetCancelled };
}
