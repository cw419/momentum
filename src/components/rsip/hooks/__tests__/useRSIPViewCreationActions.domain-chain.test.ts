import { act, renderHook } from '@testing-library/react';
import type { Dispatch, SetStateAction } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRsipDomain } from '../../../../hooks/domains/useRsipDomain';
import {
  createAppState,
  createLocalStorageMock,
} from '../../../../test/factories';
import type { AppState } from '../../../../types';
import { useRSIPViewCreationActions } from '../useRSIPViewCreationActions';
import { createState } from './testHelpers';

function createStateContainer(initialState: AppState) {
  let state = initialState;
  const setState: Dispatch<SetStateAction<AppState>> = (update) => {
    state =
      typeof update === 'function'
        ? (update as (previous: AppState) => AppState)(state)
        : update;
  };
  return { getState: () => state, setState };
}

describe('RSIP creation atomic domain chain', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries the same node without exposing either slice before atomic success', async () => {
    const now = new Date('2026-07-16T08:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001',
    );
    const originalNodes: AppState['rsipNodes'] = [];
    const originalMeta: AppState['rsipMeta'] = {
      allowMultiplePerDay: false,
    };
    const stateRef = createStateContainer(
      createAppState({ rsipNodes: originalNodes, rsipMeta: originalMeta }),
    );
    const failure = new Error('atomic creation response unavailable');
    const createRSIPNodesWithMeta = vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(undefined);
    const storage = createLocalStorageMock({ createRSIPNodesWithMeta });
    const domain = useRsipDomain({
      setState: stateRef.setState,
      storage,
      getState: stateRef.getState,
    });
    const state = createState({
      nodes: originalNodes,
      meta: originalMeta,
      isStrictMode: true,
      canAddToday: true,
      title: 'Atomic policy',
      rule: 'Commit nodes and metadata together',
    });
    const { result } = renderHook(() =>
      useRSIPViewCreationActions({
        state,
        props: {
          onCreateNodes: domain.createNodes,
          onSaveNodes: domain.saveNodes,
          onSaveMeta: domain.saveMeta,
        },
      }),
    );

    await act(async () => {
      await expect(result.current.handleAddSingle()).rejects.toBe(failure);
    });

    expect(stateRef.getState().rsipNodes).toBe(originalNodes);
    expect(stateRef.getState().rsipMeta).toBe(originalMeta);
    expect(storage.saveRSIPNodes).not.toHaveBeenCalled();
    expect(storage.saveRSIPMeta).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.handleAddSingle();
    });

    expect(stateRef.getState().rsipNodes).toEqual([
      expect.objectContaining({
        id: '00000000-0000-4000-8000-000000000001',
        title: 'Atomic policy',
      }),
    ]);
    expect(stateRef.getState().rsipMeta).toEqual({
      allowMultiplePerDay: false,
      lastAddedAt: now,
      currentRunNumber: 1,
      currentRunStartedAt: now,
    });
    expect(createRSIPNodesWithMeta).toHaveBeenCalledTimes(2);
    expect(createRSIPNodesWithMeta.mock.calls[1]).toEqual(
      createRSIPNodesWithMeta.mock.calls[0],
    );
  });
});
