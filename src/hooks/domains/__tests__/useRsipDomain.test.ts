import { describe, expect, it, vi } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState, RSIPNode } from '../../../types';
import type { MomentumStorage } from '../../../storage/MomentumStorage';
import { useRsipDomain } from '../useRsipDomain';

function createBaseState(): AppState {
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
  };
}

describe('useRsipDomain', () => {
  it('optimistically updates rsipNodes before persistence resolves', async () => {
    let state = createBaseState();
    const setState: Dispatch<SetStateAction<AppState>> = (update) => {
      state = typeof update === 'function' ? (update as (prev: AppState) => AppState)(state) : update;
    };

    let resolveSave!: () => void;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });

    const storage = {
      saveRSIPNodes: vi.fn().mockReturnValue(savePromise),
    } as unknown as MomentumStorage;

    const domain = useRsipDomain({ setState, storage });

    const nodes: RSIPNode[] = [
      {
        id: 'rsip-1',
        title: 'Test',
        rule: 'Test rule',
        sortOrder: 1,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
    ];

    const pending = domain.saveNodes(nodes);

    expect(state.rsipNodes).toEqual(nodes);

    resolveSave();
    await pending;

    expect(storage.saveRSIPNodes).toHaveBeenCalledWith(nodes);
  });

  it('does not throw when persistence fails', async () => {
    let state = createBaseState();
    const setState: Dispatch<SetStateAction<AppState>> = (update) => {
      state = typeof update === 'function' ? (update as (prev: AppState) => AppState)(state) : update;
    };

    const storage = {
      saveRSIPNodes: vi.fn().mockRejectedValue(new Error('persist failed')),
    } as unknown as MomentumStorage;

    const domain = useRsipDomain({ setState, storage });

    const nodes: RSIPNode[] = [
      {
        id: 'rsip-1',
        title: 'Test',
        rule: 'Test rule',
        sortOrder: 1,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
    ];

    await expect(domain.saveNodes(nodes)).resolves.toBeUndefined();
    expect(state.rsipNodes).toEqual(nodes);
  });
});
