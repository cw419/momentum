import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';

interface UseViewValidationParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  isInitialized: boolean;
}

/**
 * Validates that the current view is consistent with app state.
 * Redirects to dashboard if viewing invalid/missing chains.
 */
export function useViewValidation({
  state,
  setState,
  isInitialized,
}: UseViewValidationParams): void {
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const currentView = state.currentView;
  const activeSessionChainId = state.activeSession?.chainId ?? null;
  const viewingChainId = state.viewingChainId;

  useEffect(() => {
    if (!isInitialized) return;
    if (currentView === 'focus') {
      const activeChain = stateRef.current.chains.find(
        (c) => c.id === activeSessionChainId,
      );
      if (!activeSessionChainId || !activeChain) {
        setState((prev) => ({
          ...prev,
          currentView: 'dashboard',
          editingChain: null,
          viewingChainId: null,
        }));
      }
    }
  }, [currentView, activeSessionChainId, isInitialized, setState]);

  useEffect(() => {
    if (!isInitialized) return;
    if (currentView === 'detail' || currentView === 'group') {
      const viewingChain = stateRef.current.chains.find(
        (c) => c.id === viewingChainId,
      );
      if (!viewingChain) {
        setState((prev) => ({
          ...prev,
          currentView: 'dashboard',
          editingChain: null,
          viewingChainId: null,
        }));
      }
    }
  }, [currentView, viewingChainId, isInitialized, setState]);
}
