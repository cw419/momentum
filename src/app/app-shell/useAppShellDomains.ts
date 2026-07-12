import type { MomentumStorage } from '../../storage/MomentumStorage';
import { useAppShellPrimaryDomains } from './useAppShellPrimaryDomains';
import { useAppShellSecondaryDomains } from './useAppShellSecondaryDomains';
import type { AppShellStateController } from './useAppShellState';

export function useAppShellDomains(
  storage: MomentumStorage,
  state: AppShellStateController,
) {
  const primary = useAppShellPrimaryDomains(storage, state);
  const secondary = useAppShellSecondaryDomains(storage, state, primary);
  return { ...primary, ...secondary };
}

export type AppShellDomains = ReturnType<typeof useAppShellDomains>;
