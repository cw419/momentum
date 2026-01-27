import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';
import { parseViewStateFromSearch, serializeViewStateToSearch } from '../viewUrlState';

interface UseViewUrlSyncParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  shouldLoadData: boolean;
  isLoadingData: boolean;
}

export function useViewUrlSync({
  state,
  setState,
  shouldLoadData,
  isLoadingData,
}: UseViewUrlSyncParams): void {
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const isApplyingUrlRef = useRef(false);
  const hasProcessedInitialUrlRef = useRef(false);

  useEffect(() => {
    if (!shouldLoadData) {
      hasProcessedInitialUrlRef.current = false;
    }
  }, [shouldLoadData]);

  // Apply URL -> state once, after data is available.
  useEffect(() => {
    if (!shouldLoadData || isLoadingData) return;
    if (hasProcessedInitialUrlRef.current) return;
    hasProcessedInitialUrlRef.current = true;

    const next = parseViewStateFromSearch({
      search: window.location.search,
      chains: stateRef.current.chains,
      activeSession: stateRef.current.activeSession,
    });

    const hasViewParam = new URLSearchParams(window.location.search).has('view');
    if (hasViewParam && next.currentView === 'dashboard') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    }

    isApplyingUrlRef.current = true;
    setState(prev => ({
      ...prev,
      currentView: next.currentView,
      viewingChainId: next.viewingChainId,
      editingChain: next.editingChain,
    }));

    setTimeout(() => {
      isApplyingUrlRef.current = false;
    }, 0);
  }, [shouldLoadData, isLoadingData, setState]);

  // Sync state -> URL on navigation changes.
  useEffect(() => {
    if (!hasProcessedInitialUrlRef.current) return;
    if (!shouldLoadData || isLoadingData) return;
    if (isApplyingUrlRef.current) return;

    const nextSearch = serializeViewStateToSearch({
      currentView: state.currentView,
      viewingChainId: state.viewingChainId,
      editingChainId: state.editingChain?.id ?? null,
      activeSessionChainId: state.activeSession?.chainId ?? null,
    });

    if (nextSearch === window.location.search) return;

    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    window.history.pushState(null, '', nextUrl);
  }, [
    state.currentView,
    state.viewingChainId,
    state.editingChain?.id,
    state.activeSession?.chainId,
    shouldLoadData,
    isLoadingData,
  ]);

  // Handle browser back/forward.
  useEffect(() => {
    const onPopState = () => {
      const next = parseViewStateFromSearch({
        search: window.location.search,
        chains: stateRef.current.chains,
        activeSession: stateRef.current.activeSession,
      });

      isApplyingUrlRef.current = true;
      setState(prev => ({
        ...prev,
        currentView: next.currentView,
        viewingChainId: next.viewingChainId,
        editingChain: next.editingChain,
      }));

      setTimeout(() => {
        isApplyingUrlRef.current = false;
      }, 0);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setState]);
}
