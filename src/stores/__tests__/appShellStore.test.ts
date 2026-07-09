import { beforeEach, describe, expect, it } from 'vitest';
import { createGroupChain } from '../../test/factories';
import { createAppState } from '../../test/factories/appStateFactory';
import {
  appShellStore,
  createInitialAppState,
  createAppShellStore,
} from '../appShellStore';

describe('appShellStore', () => {
  beforeEach(() => {
    appShellStore.getState().resetAppState();
  });

  it('creates the documented initial app state', () => {
    const store = createAppShellStore();

    expect(store.getState()).toMatchObject(createInitialAppState());
  });

  it('updateAppState merges data fields without touching other state', () => {
    const store = createAppShellStore();
    const chain = createGroupChain({ id: 'group-1' });

    store.getState().updateAppState((prev) => ({
      ...prev,
      chains: [chain],
      chainsRevision: prev.chainsRevision + 1,
    }));

    expect(store.getState().chains).toEqual([chain]);
    expect(store.getState().chainsRevision).toBe(1);
  });

  it('resetAppState returns data fields to defaults', () => {
    const state = createAppState({
      chains: [createGroupChain({ id: 'group-2' })],
      chainsRevision: 3,
    });
    const store = createAppShellStore(state);

    store.getState().resetAppState();

    expect(store.getState()).toMatchObject(createInitialAppState());
  });

  it('replaceAppState overwrites data fields', () => {
    const store = createAppShellStore();
    const chain = createGroupChain({ id: 'group-3' });

    store.getState().replaceAppState({
      ...createInitialAppState(),
      chains: [chain],
      chainsRevision: 5,
    });

    expect(store.getState().chains).toEqual([chain]);
    expect(store.getState().chainsRevision).toBe(5);
  });
});
