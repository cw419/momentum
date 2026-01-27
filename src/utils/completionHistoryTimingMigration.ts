import type { Chain, CompletionHistory } from '../types';

export function migrateCompletionHistoryForTiming(
  history: CompletionHistory[],
  chains: Chain[]
): { updatedHistory: CompletionHistory[]; hasChanges: boolean } {
  const chainById = new Map(chains.map(chain => [chain.id, chain]));
  let hasChanges = false;

  const updatedHistory = history.map(record => {
    if (record.actualDuration !== undefined && record.isForwardTimed !== undefined) {
      return record;
    }

    const chain = chainById.get(record.chainId);
    hasChanges = true;
    return {
      ...record,
      actualDuration: record.duration,
      isForwardTimed: chain?.isDurationless || false,
    };
  });

  return { updatedHistory, hasChanges };
}

