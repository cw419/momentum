import type { Dispatch, SetStateAction } from 'react';
import type { BetPlacementResult } from '../../domain/betting';
import { useStorage } from '../../storage/StorageContext';

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
    console.log('Bet placed successfully:', betResult);

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
          console.error('Failed to delete cancelled session:', result.error);
        }
        console.log('已删除取消的会话记录，押注已通过触发器退款:', currentSessionId);
      } catch (error) {
        console.error('删除取消的会话记录失败:', error);
      }
    }

    setPendingChainId(null);
    setCurrentSessionId(null);
    setActiveSessionId(null);
    setShowBettingModal(false);
  };

  return { handleBetPlaced, handleBetCancelled };
}
