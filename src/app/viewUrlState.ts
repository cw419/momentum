import type { ActiveSession, Chain, ViewState } from '../types';

export type UrlSyncedViewState = {
  currentView: ViewState;
  viewingChainId: string | null;
  editingChain: Chain | null;
};

const VALID_VIEWS: ReadonlySet<ViewState> = new Set([
  'dashboard',
  'editor',
  'focus',
  'detail',
  'group',
  'rsip',
  'taskgroup-editor',
]);

export function serializeViewStateToSearch(state: {
  currentView: ViewState;
  viewingChainId: string | null;
  editingChainId: string | null;
  activeSessionChainId: string | null;
}): string {
  const params = new URLSearchParams();

  if (state.currentView !== 'dashboard') {
    params.set('view', state.currentView);
  }

  if ((state.currentView === 'detail' || state.currentView === 'group') && state.viewingChainId) {
    params.set('chain', state.viewingChainId);
  }

  if (state.currentView === 'focus' && state.activeSessionChainId) {
    params.set('chain', state.activeSessionChainId);
  }

  if (state.currentView === 'editor' || state.currentView === 'taskgroup-editor') {
    if (state.editingChainId) {
      params.set('edit', state.editingChainId);
    } else if (state.viewingChainId) {
      params.set('parent', state.viewingChainId);
    }
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

export function parseViewStateFromSearch(input: {
  search: string;
  chains: Chain[];
  activeSession: ActiveSession | null;
}): UrlSyncedViewState {
  const params = new URLSearchParams(input.search);
  const rawView = params.get('view');

  if (!rawView) {
    return { currentView: 'dashboard', viewingChainId: null, editingChain: null };
  }

  if (!VALID_VIEWS.has(rawView as ViewState)) {
    return { currentView: 'dashboard', viewingChainId: null, editingChain: null };
  }

  const view = rawView as ViewState;
  if (view === 'dashboard') {
    return { currentView: 'dashboard', viewingChainId: null, editingChain: null };
  }

  if (view === 'rsip') {
    return { currentView: 'rsip', viewingChainId: null, editingChain: null };
  }

  if (view === 'focus') {
    if (!input.activeSession) {
      return { currentView: 'dashboard', viewingChainId: null, editingChain: null };
    }
    return { currentView: 'focus', viewingChainId: null, editingChain: null };
  }

  if (view === 'detail' || view === 'group') {
    const chainId = params.get('chain');
    if (!chainId) {
      return { currentView: 'dashboard', viewingChainId: null, editingChain: null };
    }

    const chain = input.chains.find((c) => c.id === chainId);
    if (!chain) {
      return { currentView: 'dashboard', viewingChainId: null, editingChain: null };
    }

    return {
      currentView: chain.type === 'group' ? 'group' : 'detail',
      viewingChainId: chainId,
      editingChain: null,
    };
  }

  if (view === 'editor' || view === 'taskgroup-editor') {
    const editChainId = params.get('edit');
    if (editChainId) {
      const chain = input.chains.find((c) => c.id === editChainId);
      if (!chain) {
        return { currentView: 'dashboard', viewingChainId: null, editingChain: null };
      }

      const isTaskGroup = chain.type === 'group' || chain.isTaskGroup;
      return {
        currentView: isTaskGroup ? 'taskgroup-editor' : 'editor',
        viewingChainId: null,
        editingChain: chain,
      };
    }

    const parentId = params.get('parent');
    return {
      currentView: view,
      viewingChainId: parentId || null,
      editingChain: null,
    };
  }

  return { currentView: 'dashboard', viewingChainId: null, editingChain: null };
}
