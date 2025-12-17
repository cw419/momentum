import type { Dispatch, SetStateAction } from 'react';
import type { BetPlacementResult } from '../../domain/betting';
import { useStorage } from '../../storage/StorageContext';
import { logger } from '../../utils/logger';
import { isDev } from '../../utils/env';

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

  const handleBetPlaced = async (betResult: BetPlacementResult) => {
    if (isDev) {
      logger.debug('BETTING', 'Bet placed successfully', { betResult });
    }

    if (pendingChainId) {
      setActiveSessionId(currentSessionId);
      await handleStartChain(pendingChainId);
    }

    setPendingChainId(null);
    setCurrentSessionId(null);
    setShowBettingModal(false);
  };

  const handleBetCancelled = async () => {
    if (currentSessionId && storage.kind === 'supabase') {
      try {
        const result = await storage.deleteBettingSession(currentSessionId);
        if (!result.ok) {
          logger.error('BETTING', 'Failed to delete cancelled session', {
            sessionId: currentSessionId,
            error: result.error,
          });
        }
        if (isDev) {
          logger.debug('BETTING', 'Cancelled session deleted (refund handled by trigger)', { sessionId: currentSessionId });
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('BETTING', '删除取消的会话记录失败', { sessionId: currentSessionId }, err);
      }
    }

    setPendingChainId(null);
    setCurrentSessionId(null);
    setActiveSessionId(null);
    setShowBettingModal(false);
  };

  return { handleBetPlaced, handleBetCancelled };
}
