import { beforeEach, describe, expect, it } from 'vitest';
import { createGroupChain, createUnitChain } from '../../test/factories';
import {
  createInitialUIState,
  createUIStore,
  selectBettingModal,
} from '../uiStore';

describe('uiStore', () => {
  let store: ReturnType<typeof createUIStore>;

  beforeEach(() => {
    store = createUIStore();
  });

  it('creates the documented initial UI state', () => {
    expect(store.getState()).toMatchObject(createInitialUIState());
  });

  it('navigates back to dashboard and clears editor/detail state', () => {
    const chain = createUnitChain({ id: 'chain-1' });

    store.getState().setEditingChain(chain);
    store.getState().setViewingChainId(chain.id);
    store.getState().navigateToView('editor');

    store.getState().navigateToDashboard();

    expect(store.getState().currentView).toBe('dashboard');
    expect(store.getState().editingChain).toBeNull();
    expect(store.getState().viewingChainId).toBeNull();
  });

  it('opens and closes the betting flow atomically', () => {
    store.getState().openBettingFlow('chain-2', 'session-2');

    expect(selectBettingModal(store.getState())).toEqual({
      isOpen: true,
      pendingChainId: 'chain-2',
      currentSessionId: 'session-2',
    });

    store.getState().closeBettingFlow();

    expect(selectBettingModal(store.getState())).toEqual({
      isOpen: false,
      pendingChainId: null,
      currentSessionId: null,
    });
  });

  it('resets all UI state back to defaults', () => {
    const chain = createGroupChain({ id: 'group-1' });

    store.getState().setShowAuxiliaryJudgment('aux-1');
    store.getState().setActiveSessionId('active-1');
    store.getState().setEditingChain(chain);
    store.getState().setViewingChainId(chain.id);
    store.getState().navigateToView('group');

    store.getState().resetAllUI();

    expect(store.getState()).toMatchObject(createInitialUIState());
  });
});
