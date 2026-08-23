import type { MomentumStorage } from '../../storage/MomentumStorage';
import { useAppShellPrimaryDomains } from './useAppShellPrimaryDomains';
import { useAppShellSecondaryDomains } from './useAppShellSecondaryDomains';
import { useCompletionHistoryDomain } from '../../hooks/domains/useCompletionHistoryDomain';
import type { AppShellStateController } from './useAppShellState';

export function useAppShellDomains(
  storage: MomentumStorage,
  state: AppShellStateController,
) {
  const primary = useAppShellPrimaryDomains(storage, state);
  const secondary = useAppShellSecondaryDomains(storage, state, primary);
  const completionHistory = useCompletionHistoryDomain(storage, state);
  return { ...primary, ...secondary, ...completionHistory };
}

export type AppShellDomains = ReturnType<typeof useAppShellDomains>;
