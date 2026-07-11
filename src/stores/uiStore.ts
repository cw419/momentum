import {
  createNavigationStore,
  createInitialNavigationState,
  selectBettingModal,
} from './navigationStore';
import type { NavigationStore, NavigationStoreApi } from './navigationStore';

type UIStore = NavigationStore & { resetAllUI: () => void };
type UIStoreApi = Omit<NavigationStoreApi, 'getState'> & {
  getState: () => UIStore;
};

function withLegacyUiAliases(store: NavigationStoreApi): UIStoreApi {
  return {
    ...store,
    getState: () => ({
      ...store.getState(),
      resetAllUI: store.getState().resetNavigationState,
    }),
  };
}

export function createUIStore(
  initialState?: Partial<Parameters<typeof createNavigationStore>[0]>,
) {
  return withLegacyUiAliases(createNavigationStore(initialState));
}

export const createInitialUIState = createInitialNavigationState;
export { selectBettingModal };
