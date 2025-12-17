import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import type { SafelySaveChains } from './useChainsDomain';
import { queryOptimizer } from '../../utils/queryOptimizer';
import { logger } from '../../utils/logger';

interface UseRulesDomainParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  safelySaveChains: SafelySaveChains;
  setShowAuxiliaryJudgment: Dispatch<SetStateAction<string | null>>;
}

export function useRulesDomain({
  state,
  setState,
  storage,
  safelySaveChains,
  setShowAuxiliaryJudgment,
}: UseRulesDomainParams) {
  const persistChains = (chainId: string, updatedChains: AppState['chains'], context: string) => {
    safelySaveChains(updatedChains).catch(error => {
      queryOptimizer.onDataChange('chains');
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('RULES_DOMAIN', context, { chainId }, err);
    });
  };

  const persistScheduledSessions = (
    chainId: string,
    updatedScheduledSessions: AppState['scheduledSessions'],
    context: string
  ) => {
    void storage.saveScheduledSessions(updatedScheduledSessions).catch(error => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('RULES_DOMAIN', context, { chainId }, err);
    });
  };

  const handleAuxiliaryJudgmentFailure = (chainId: string) => {
    const updatedScheduledSessions = state.scheduledSessions.filter(session => session.chainId !== chainId);
    const updatedChains = state.chains.map(chain =>
      chain.id === chainId
        ? {
            ...chain,
            auxiliaryStreak: 0,
            auxiliaryFailures: chain.auxiliaryFailures + 1,
          }
        : chain
    );

    persistChains(chainId, updatedChains, 'Failed to persist chains after failure judgment');
    persistScheduledSessions(chainId, updatedScheduledSessions, 'Failed to persist scheduled sessions after failure judgment');

    setState(prev => ({
      ...prev,
      chains: updatedChains,
      scheduledSessions: updatedScheduledSessions,
    }));
    setShowAuxiliaryJudgment(null);
  };

  const handleAuxiliaryJudgmentAllow = (chainId: string, exceptionRule: string) => {
    const updatedScheduledSessions = state.scheduledSessions.filter(session => session.chainId !== chainId);
    const updatedChains = state.chains.map(chain =>
      chain.id === chainId
        ? { ...chain, auxiliaryExceptions: [...(chain.auxiliaryExceptions || []), exceptionRule] }
        : chain
    );

    persistChains(chainId, updatedChains, 'Failed to persist chains after allow judgment');
    persistScheduledSessions(chainId, updatedScheduledSessions, 'Failed to persist scheduled sessions after allow judgment');

    setState(prev => ({
      ...prev,
      chains: updatedChains,
      scheduledSessions: updatedScheduledSessions,
    }));
    setShowAuxiliaryJudgment(null);
  };

  return { handleAuxiliaryJudgmentFailure, handleAuxiliaryJudgmentAllow };
}
