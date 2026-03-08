import { beforeEach, describe, expect, it } from 'vitest';
import { createGroupChain } from '../../test/factories';
import { createAppState } from '../../test/factories/appStateFactory';
import {
  appShellStore,
  createInitialAppShellState,
  createAppShellStore,
  selectBettingModal,
} from '../appShellStore';

describe('appShellStore', () => {
  const resetStore = () => {
    appShellStore.getState().resetAllAppShellState();
  };

  beforeEach(() => {
    resetStore();
  });

  it('creates the documented initial app shell state', () => {
    const store = createAppShellStore();

    expect(store.getState()).toMatchObject(createInitialAppShellState());
  });

  it('updates app data without clobbering navigation state', () => {
    const store = createAppShellStore();
    const chain = createGroupChain({ id: 'group-1' });

    store.getState().setEditingChain(chain);
    store.getState().navigateToView('group');
    store.getState().updateAppState((prev) => ({
      ...prev,
      chains: [chain],
      chainsRevision: prev.chainsRevision + 1,
    }));

    expect(store.getState().currentView).toBe('group');
    expect(store.getState().editingChain).toEqual(chain);
    expect(store.getState().chains).toEqual([chain]);
    expect(store.getState().chainsRevision).toBe(1);
  });

  it('opens and closes the betting flow atomically', () => {
    const store = createAppShellStore();

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

  it('resets both app data and navigation state back to defaults', () => {
    const state = createAppState({
      chains: [createGroupChain({ id: 'group-2' })],
      chainsRevision: 3,
    });
    const store = createAppShellStore({
      ...state,
      currentView: 'group',
      viewingChainId: 'group-2',
      showAuxiliaryJudgment: 'group-2',
    });

    store.getState().resetAllAppShellState();

    expect(store.getState()).toMatchObject(createInitialAppShellState());
  });
});
