import { useEffect } from 'react';
import type { ActiveSession, Chain } from '../../types';
import {
  appShellStore,
  selectCurrentView,
  selectViewingChainId,
  useAppShellStore,
} from '../../stores/appShellStore';

interface UseViewValidationParams {
  chains: Chain[];
  activeSession: ActiveSession | null;
  isInitialized: boolean;
}

/**
 * Validates that the current view is consistent with app state.
 * Redirects to dashboard if viewing invalid/missing chains.
 */
export function useViewValidation({
  chains,
  activeSession,
  isInitialized,
}: UseViewValidationParams): void {
  const currentView = useAppShellStore(selectCurrentView);
  const viewingChainId = useAppShellStore(selectViewingChainId);
  const activeSessionChainId = activeSession?.chainId ?? null;

  useEffect(() => {
    if (!isInitialized) return;
    if (currentView === 'focus') {
      const activeChain = chains.find((c) => c.id === activeSessionChainId);
      if (!activeSessionChainId || !activeChain) {
        appShellStore.getState().navigateToDashboard();
      }
    }
  }, [chains, currentView, activeSessionChainId, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    if (currentView === 'detail' || currentView === 'group') {
      const viewingChain = chains.find((c) => c.id === viewingChainId);
      if (!viewingChain) {
        appShellStore.getState().navigateToDashboard();
      }
    }
  }, [chains, currentView, viewingChainId, isInitialized]);
}
