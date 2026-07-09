import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type {
  AppState,
  RsipState,
  RuleState,
  TaskRuntimeState,
} from '../types';

type AppStateUpdater = AppState | ((prev: AppState) => AppState);

interface AppShellStateActions {
  updateAppState: (update: AppStateUpdater) => void;
  replaceAppState: (nextState: AppState) => void;
  resetAppState: () => void;
}

/** @deprecated Use AppState directly; AppShellStoreState is now identical. */
export type AppShellStoreState = AppState;
export type AppShellStore = AppState & AppShellStateActions;
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

/**
 * @deprecated Use createInitialAppState() + createInitialNavigationState() separately.
 * Kept for test backward-compatibility.
 */
export { createInitialAppState as createInitialAppShellState };

function extractTaskRuntimeState(state: AppState): TaskRuntimeState {
  return {
    chains: state.chains,
    chainsRevision: state.chainsRevision,
    scheduledSessions: state.scheduledSessions,
    activeSession: state.activeSession,
    completionHistory: state.completionHistory,
    taskTimeStats: state.taskTimeStats,
  };
}

function extractRsipState(state: AppState): RsipState {
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

function extractRuleState(state: AppState): RuleState {
  return {
    exceptionRules: state.exceptionRules,
    ruleUsageRecords: state.ruleUsageRecords,
  };
}

function extractAppState(state: AppState): AppState {
  return {
    ...extractTaskRuntimeState(state),
    ...extractRsipState(state),
    ...extractRuleState(state),
  };
}

export function createAppShellStore(initialState?: Partial<AppState>) {
  const initial: AppState = {
    ...createInitialAppState(),
    ...initialState,
  };

  return createStore<AppShellStore>()((set) => ({
    ...initial,
    updateAppState: (update) =>
      set((prev) => {
        const current = extractAppState(prev);
        const next =
          typeof update === 'function' ? update(current) : update;
        return { ...prev, ...next };
      }),
    replaceAppState: (nextState) =>
      set((prev) => ({ ...prev, ...nextState })),
    resetAppState: () => set(createInitialAppState()),
  }));
}

export const appShellStore = createAppShellStore();

export function useAppShellStore<T>(selector: (state: AppShellStore) => T): T {
  return useStore(appShellStore, selector);
}

export function getAppStateSnapshot(): AppState {
  return extractAppState(appShellStore.getState());
}
