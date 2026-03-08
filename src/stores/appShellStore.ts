import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type {
  AppState,
  Chain,
  RsipState,
  RuleState,
  TaskRuntimeState,
  ViewState,
} from '../types';

interface NavigationState {
  showAuxiliaryJudgment: string | null;
  showBettingModal: boolean;
  pendingChainId: string | null;
  currentSessionId: string | null;
  activeSessionId: string | null;
  currentView: ViewState;
  editingChain: Chain | null;
  viewingChainId: string | null;
}

interface NavigationActions {
  setShowAuxiliaryJudgment: (chainId: string | null) => void;
  setShowBettingModal: (isOpen: boolean) => void;
  setPendingChainId: (chainId: string | null) => void;
  setCurrentSessionId: (sessionId: string | null) => void;
  setActiveSessionId: (sessionId: string | null) => void;
  setEditingChain: (chain: Chain | null) => void;
  setViewingChainId: (chainId: string | null) => void;
  navigateToView: (view: ViewState) => void;
  navigateToDashboard: () => void;
  openBettingFlow: (chainId: string, sessionId: string) => void;
  closeBettingFlow: () => void;
  resetNavigationState: () => void;
}

type AppStateUpdater = AppState | ((prev: AppState) => AppState);

interface AppShellStateActions {
  updateAppState: (update: AppStateUpdater) => void;
  replaceAppState: (nextState: AppState) => void;
  resetAppState: () => void;
  resetAllAppShellState: () => void;
}

export type AppShellStoreState = AppState & NavigationState;
export type AppShellStore = AppShellStoreState &
  NavigationActions &
  AppShellStateActions;
export type AppShellStoreApi = ReturnType<typeof createAppShellStore>;

export function createInitialAppState(): AppState {
  return {
    chains: [],
    chainsRevision: 0,
    scheduledSessions: [],
    activeSession: null,
    completionHistory: [],
    rsipNodes: [],
    rsipMeta: {},
    rsipGroups: [],
    rsipPolicyLibrary: [],
    rsipRunHistory: [],
    rsipTaskLinks: [],
    rsipExecutionRecords: [],
    taskTimeStats: [],
    exceptionRules: [],
    ruleUsageRecords: [],
  };
}

export function createInitialNavigationState(): NavigationState {
  return {
    showAuxiliaryJudgment: null,
    showBettingModal: false,
    pendingChainId: null,
    currentSessionId: null,
    activeSessionId: null,
    currentView: 'dashboard',
    editingChain: null,
    viewingChainId: null,
  };
}

export function createInitialAppShellState(): AppShellStoreState {
  return {
    ...createInitialAppState(),
    ...createInitialNavigationState(),
  };
}

function extractTaskRuntimeState(state: AppShellStoreState): TaskRuntimeState {
  return {
    chains: state.chains,
    chainsRevision: state.chainsRevision,
    scheduledSessions: state.scheduledSessions,
    activeSession: state.activeSession,
    completionHistory: state.completionHistory,
    taskTimeStats: state.taskTimeStats,
  };
}

function extractRsipState(state: AppShellStoreState): RsipState {
  return {
    rsipNodes: state.rsipNodes,
    rsipMeta: state.rsipMeta,
    rsipGroups: state.rsipGroups,
    rsipPolicyLibrary: state.rsipPolicyLibrary,
    rsipRunHistory: state.rsipRunHistory,
    rsipTaskLinks: state.rsipTaskLinks,
    rsipExecutionRecords: state.rsipExecutionRecords,
  };
}

function extractRuleState(state: AppShellStoreState): RuleState {
  return {
    exceptionRules: state.exceptionRules,
    ruleUsageRecords: state.ruleUsageRecords,
  };
}

function extractAppState(state: AppShellStoreState): AppState {
  return {
    ...extractTaskRuntimeState(state),
    ...extractRsipState(state),
    ...extractRuleState(state),
  };
}

function buildStoreState(
  initialState?: Partial<AppShellStoreState>,
): AppShellStoreState {
  return {
    ...createInitialAppShellState(),
    ...initialState,
  };
}

export function createAppShellStore(
  initialState?: Partial<AppShellStoreState>,
) {
  return createStore<AppShellStore>()((set) => {
    const initialStoreState = buildStoreState(initialState);

    return {
      ...initialStoreState,
      setShowAuxiliaryJudgment: (chainId) =>
        set({ showAuxiliaryJudgment: chainId }),
      setShowBettingModal: (isOpen) => set({ showBettingModal: isOpen }),
      setPendingChainId: (chainId) => set({ pendingChainId: chainId }),
      setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
      setActiveSessionId: (sessionId) => set({ activeSessionId: sessionId }),
      setEditingChain: (chain) => set({ editingChain: chain }),
      setViewingChainId: (chainId) => set({ viewingChainId: chainId }),
      navigateToView: (view) =>
        set({
          currentView: view,
          ...(view === 'dashboard'
            ? {
                editingChain: null,
                viewingChainId: null,
              }
            : {}),
        }),
      navigateToDashboard: () =>
        set({
          currentView: 'dashboard',
          editingChain: null,
          viewingChainId: null,
        }),
      openBettingFlow: (chainId, sessionId) =>
        set({
          showBettingModal: true,
          pendingChainId: chainId,
          currentSessionId: sessionId,
        }),
      closeBettingFlow: () =>
        set({
          showBettingModal: false,
          pendingChainId: null,
          currentSessionId: null,
        }),
      updateAppState: (update) =>
        set((prev) => {
          const currentAppState = extractAppState(prev);
          const nextAppState =
            typeof update === 'function' ? update(currentAppState) : update;
          return { ...prev, ...nextAppState };
        }),
      replaceAppState: (nextState) =>
        set((prev) => ({
          ...prev,
          ...nextState,
        })),
      resetNavigationState: () =>
        set((prev) => ({
          ...prev,
          ...createInitialNavigationState(),
        })),
      resetAppState: () =>
        set((prev) => ({
          ...prev,
          ...createInitialAppState(),
        })),
      resetAllAppShellState: () =>
        set({
          ...createInitialAppShellState(),
        }),
    };
  });
}

export const appShellStore = createAppShellStore();

export function useAppShellStore<T>(selector: (state: AppShellStore) => T): T {
  return useStore(appShellStore, selector);
}

export const selectShowAuxiliaryJudgment = (
  state: AppShellStore,
): string | null => state.showAuxiliaryJudgment;
export const selectShowBettingModal = (state: AppShellStore): boolean =>
  state.showBettingModal;
export const selectPendingChainId = (state: AppShellStore): string | null =>
  state.pendingChainId;
export const selectCurrentSessionId = (state: AppShellStore): string | null =>
  state.currentSessionId;
export const selectActiveSessionId = (state: AppShellStore): string | null =>
  state.activeSessionId;
export const selectCurrentView = (state: AppShellStore): ViewState =>
  state.currentView;
export const selectEditingChain = (state: AppShellStore): Chain | null =>
  state.editingChain;
export const selectViewingChainId = (state: AppShellStore): string | null =>
  state.viewingChainId;

export function selectBettingModal(state: AppShellStore) {
  return {
    isOpen: state.showBettingModal,
    pendingChainId: state.pendingChainId,
    currentSessionId: state.currentSessionId,
  };
}

export function getAppStateSnapshot(): AppState {
  return extractAppState(appShellStore.getState());
}
