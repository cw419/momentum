import { useCallback } from 'react';
import type { CompletionHistory } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import type { AppShellStateController } from '../../app/app-shell/useAppShellState';

export function useCompletionHistoryDomain(
  storage: MomentumStorage,
  state: AppShellStateController,
) {
  const updateCompletionHistory = useCallback(
    async (
      id: string,
      updates: Pick<CompletionHistory, 'description' | 'notes'>,
    ) => {
      const previousHistory = state.completionHistory;
      if (!previousHistory.some((record) => record.id === id)) {
        throw new Error('Completion history record not found');
      }
      const updatedHistory = previousHistory.map((record) =>
        record.id === id ? { ...record, ...updates } : record,
      );

      state.setState((previous) => ({
        ...previous,
        completionHistory: updatedHistory,
      }));

      try {
        await storage.updateCompletionHistory(id, updates);
      } catch (error) {
        state.setState((previous) => ({
          ...previous,
          completionHistory: previous.completionHistory.map((record) =>
            record.id === id
              ? (previousHistory.find((item) => item.id === id) ?? record)
              : record,
          ),
        }));
        throw error;
      }
    },
    [state, storage],
  );

  return { updateCompletionHistory };
}
