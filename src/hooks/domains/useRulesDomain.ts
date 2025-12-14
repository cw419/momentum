import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import type { SafelySaveChains } from './useChainsDomain';
import { queryOptimizer } from '../../utils/queryOptimizer';

interface UseRulesDomainParams {
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  safelySaveChains: SafelySaveChains;
  setShowAuxiliaryJudgment: Dispatch<SetStateAction<string | null>>;
}

export function useRulesDomain({ setState, storage, safelySaveChains, setShowAuxiliaryJudgment }: UseRulesDomainParams) {
  const handleAuxiliaryJudgmentFailure = (chainId: string) => {
    setState(prev => {
      const updatedScheduledSessions = prev.scheduledSessions.filter(session => session.chainId !== chainId);

      const updatedChains = prev.chains.map(chain =>
        chain.id === chainId
          ? {
              ...chain,
              auxiliaryStreak: 0,
              auxiliaryFailures: chain.auxiliaryFailures + 1,
            }
          : chain
      );

      safelySaveChains(updatedChains).catch(error => {
        queryOptimizer.onDataChange('chains');
        console.error('辅助判断失败时保存链条数据失败:', error);
      });
      storage.saveScheduledSessions(updatedScheduledSessions);

      return {
        ...prev,
        chains: updatedChains,
        scheduledSessions: updatedScheduledSessions,
      };
    });

    setShowAuxiliaryJudgment(null);
  };

  const handleAuxiliaryJudgmentAllow = (chainId: string, exceptionRule: string) => {
    setState(prev => {
      const updatedScheduledSessions = prev.scheduledSessions.filter(session => session.chainId !== chainId);

      const updatedChains = prev.chains.map(chain =>
        chain.id === chainId
          ? { ...chain, auxiliaryExceptions: [...(chain.auxiliaryExceptions || []), exceptionRule] }
          : chain
      );

      safelySaveChains(updatedChains).catch(error => {
        queryOptimizer.onDataChange('chains');
        console.error('辅助判断允许时保存链条数据失败:', error);
      });
      storage.saveScheduledSessions(updatedScheduledSessions);

      return {
        ...prev,
        chains: updatedChains,
        scheduledSessions: updatedScheduledSessions,
      };
    });

    setShowAuxiliaryJudgment(null);
  };

  return { handleAuxiliaryJudgmentFailure, handleAuxiliaryJudgmentAllow };
}

