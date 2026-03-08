import {
  createAppShellStore,
  createInitialNavigationState,
  selectBettingModal,
} from './appShellStore';
import type {
  AppShellStore,
  AppShellStoreApi,
  AppShellStoreState,
} from './appShellStore';

type UIStore = AppShellStore & { resetAllUI: () => void };
type UIStoreApi = Omit<AppShellStoreApi, 'getState'> & {
  getState: () => UIStore;
};

function addLegacyUiAliases(state: AppShellStore): UIStore {
  return {
    ...state,
    resetAllUI: state.resetNavigationState,
  };
}

function withLegacyUiAliases(store: AppShellStoreApi): UIStoreApi {
  return {
    ...store,
    getState: () => addLegacyUiAliases(store.getState()),
  };
}

export function createUIStore(initialState?: Partial<AppShellStoreState>) {
  return withLegacyUiAliases(createAppShellStore(initialState));
}

export const createInitialUIState = createInitialNavigationState;
export { selectBettingModal };
