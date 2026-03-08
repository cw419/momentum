import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { Chain, ViewState } from '../types';

export interface UIStoreState {
  showAuxiliaryJudgment: string | null;
  showBettingModal: boolean;
  pendingChainId: string | null;
  currentSessionId: string | null;
  activeSessionId: string | null;
  currentView: ViewState;
  editingChain: Chain | null;
  viewingChainId: string | null;
}

export interface UIStoreActions {
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
  resetAllUI: () => void;
}

export type UIStore = UIStoreState & UIStoreActions;
export type UIStoreApi = ReturnType<typeof createUIStore>;

export function createInitialUIState(): UIStoreState {
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

function buildUIStoreState(
  initialState?: Partial<UIStoreState>,
): UIStoreState {
  return {
    ...createInitialUIState(),
    ...initialState,
  };
}

export function createUIStore(initialState?: Partial<UIStoreState>) {
  return createStore<UIStore>()((set) => ({
    ...buildUIStoreState(initialState),
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
    resetAllUI: () => set(buildUIStoreState(initialState)),
  }));
}

export const uiStore = createUIStore();

export function useUIStore<T>(selector: (state: UIStore) => T): T {
  return useStore(uiStore, selector);
}

export const selectShowAuxiliaryJudgment = (state: UIStore): string | null =>
  state.showAuxiliaryJudgment;
export const selectShowBettingModal = (state: UIStore): boolean =>
  state.showBettingModal;
export const selectPendingChainId = (state: UIStore): string | null =>
  state.pendingChainId;
export const selectCurrentSessionId = (state: UIStore): string | null =>
  state.currentSessionId;
export const selectActiveSessionId = (state: UIStore): string | null =>
  state.activeSessionId;
export const selectCurrentView = (state: UIStore): ViewState =>
  state.currentView;
export const selectEditingChain = (state: UIStore): Chain | null =>
  state.editingChain;
export const selectViewingChainId = (state: UIStore): string | null =>
  state.viewingChainId;

export function selectBettingModal(state: UIStore) {
  return {
    isOpen: state.showBettingModal,
    pendingChainId: state.pendingChainId,
    currentSessionId: state.currentSessionId,
  };
}
