import type { AppState } from '../../types';

export function createAppState(overrides: Partial<AppState> = {}): AppState {
  return {
    chains: [],
    chainsRevision: 0,
    scheduledSessions: [],
    activeSession: null,
    currentView: 'dashboard',
    editingChain: null,
    viewingChainId: null,
    completionHistory: [],
    rsipNodes: [],
    rsipMeta: {},
    taskTimeStats: [],
    exceptionRules: [],
    ruleUsageRecords: [],
    ...overrides,
  };
}
