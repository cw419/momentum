import type { ActiveSession, Chain, ViewState } from '../types';

export type UrlSyncedViewState = {
  currentView: ViewState;
  viewingChainId: string | null;
  editingChain: Chain | null;
};

const DEFAULT_VIEW_STATE: UrlSyncedViewState = {
  currentView: 'dashboard',
  viewingChainId: null,
  editingChain: null,
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

function isValidView(rawView: string): rawView is ViewState {
  return VALID_VIEWS.has(rawView as ViewState);
}

function findChainById(chains: Chain[], chainId: string): Chain | null {
  return chains.find((chain) => chain.id === chainId) ?? null;
}

function parseFocusView(activeSession: ActiveSession | null): UrlSyncedViewState {
  if (!activeSession) {
    return DEFAULT_VIEW_STATE;
  }

  return {
    currentView: 'focus',
    viewingChainId: null,
    editingChain: null,
  };
}

function parseDetailOrGroupView(params: URLSearchParams, chains: Chain[]): UrlSyncedViewState {
  const chainId = params.get('chain');
  if (!chainId) {
    return DEFAULT_VIEW_STATE;
  }

  const chain = findChainById(chains, chainId);
  if (!chain) {
    return DEFAULT_VIEW_STATE;
  }

  return {
    currentView: chain.type === 'group' ? 'group' : 'detail',
    viewingChainId: chainId,
    editingChain: null,
  };
}

function parseEditorOrTaskGroupView(
  params: URLSearchParams,
  chains: Chain[],
  view: 'editor' | 'taskgroup-editor'
): UrlSyncedViewState {
  const editChainId = params.get('edit');
  if (editChainId) {
    const chain = findChainById(chains, editChainId);
    if (!chain) {
      return DEFAULT_VIEW_STATE;
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

  if (!rawView || !isValidView(rawView)) {
    return DEFAULT_VIEW_STATE;
  }

  const view = rawView;

  switch (view) {
    case 'dashboard':
      return DEFAULT_VIEW_STATE;
    case 'rsip':
      return { currentView: 'rsip', viewingChainId: null, editingChain: null };
    case 'focus':
      return parseFocusView(input.activeSession);
    case 'detail':
    case 'group':
      return parseDetailOrGroupView(params, input.chains);
    case 'editor':
    case 'taskgroup-editor':
      return parseEditorOrTaskGroupView(params, input.chains, view);
  }

  return DEFAULT_VIEW_STATE;
}
