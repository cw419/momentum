import { useCallback, useEffect, useRef } from 'react';
import type { ActiveSession, Chain } from '../../types';
import {
  parseViewStateFromSearch,
  serializeViewStateToSearch,
} from '../viewUrlState';
import {
  selectCurrentView,
  selectEditingChain,
  selectViewingChainId,
  uiStore,
  useUIStore,
} from '../../stores/uiStore';

interface UseViewUrlSyncParams {
  chains: Chain[];
  activeSession: ActiveSession | null;
  shouldLoadData: boolean;
  isLoadingData: boolean;
}

type UrlSyncedViewState = ReturnType<typeof parseViewStateFromSearch>;

export function useViewUrlSync({
  chains,
  activeSession,
  shouldLoadData,
  isLoadingData,
}: UseViewUrlSyncParams): void {
  const stateRef = useRef({ chains, activeSession });
  useEffect(() => {
    stateRef.current = { chains, activeSession };
  }, [chains, activeSession]);

  const currentView = useUIStore(selectCurrentView);
  const viewingChainId = useUIStore(selectViewingChainId);
  const editingChain = useUIStore(selectEditingChain);

  const isApplyingUrlRef = useRef(false);
  const hasProcessedInitialUrlRef = useRef(false);

  const applyViewStateFromUrl = useCallback(
    (next: UrlSyncedViewState) => {
      isApplyingUrlRef.current = true;
      uiStore.setState({
        currentView: next.currentView,
        viewingChainId: next.viewingChainId,
        editingChain: next.editingChain,
      });

      setTimeout(() => {
        isApplyingUrlRef.current = false;
      }, 0);
    },
    [],
  );

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

    const hasViewParam = new URLSearchParams(window.location.search).has(
      'view',
    );
    if (hasViewParam && next.currentView === 'dashboard') {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.hash}`,
      );
    }

    applyViewStateFromUrl(next);
  }, [shouldLoadData, isLoadingData, applyViewStateFromUrl]);

  // Sync state -> URL on navigation changes.
  useEffect(() => {
    if (!hasProcessedInitialUrlRef.current) return;
    if (!shouldLoadData || isLoadingData) return;
    if (isApplyingUrlRef.current) return;

    const nextSearch = serializeViewStateToSearch({
      currentView,
      viewingChainId,
      editingChainId: editingChain?.id ?? null,
      activeSessionChainId: activeSession?.chainId ?? null,
    });

    if (nextSearch === window.location.search) return;

    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    window.history.pushState(null, '', nextUrl);
  }, [
    currentView,
    viewingChainId,
    editingChain?.id,
    activeSession?.chainId,
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

      applyViewStateFromUrl(next);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyViewStateFromUrl]);
}
