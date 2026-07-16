import { act, renderHook } from '@testing-library/react';
import type { Dispatch, SetStateAction } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRsipDomain } from '../../../../hooks/domains/useRsipDomain';
import {
  createAppState,
  createLocalStorageMock,
} from '../../../../test/factories';
import type { AppState } from '../../../../types';
import { useRSIPViewInteractionActions } from '../useRSIPViewInteractionActions';
import {
  createChainStub,
  createNode,
  createProps,
  createState,
  createTaskLink,
} from './testHelpers';

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

describe('RSIP view storage failure chains', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('rolls back the real domain execution and blocks linked tasks when storage rejects', async () => {
    const node = createNode({ totalExecutions: 4 });
    const originalNodes = [node];
    const stateRef = createStateContainer(
      createAppState({ rsipNodes: originalNodes }),
    );
    const failure = new Error('RSIP storage unavailable');
    const storage = createLocalStorageMock({
      upsertRSIPNode: vi.fn().mockRejectedValue(failure),
      appendRSIPExecutionRecord: vi.fn(async () => undefined),
    });
    const domain = useRsipDomain({
      setState: stateRef.setState,
      storage,
      getState: stateRef.getState,
    });
    const onStartChain = vi.fn(async () => undefined);
    const state = createState({
      nodes: originalNodes,
      chains: [createChainStub('chain-1', 'Morning task')],
      taskLinks: [createTaskLink()],
    });
    const { result } = renderHook(() =>
      useRSIPViewInteractionActions({
        state,
        props: createProps(domain.saveNodes, {
          onMarkExecuted: domain.markExecuted,
          onStartChain,
        }),
      }),
    );

    await act(async () => {
      await expect(result.current.handleMarkExecuted(node.id)).rejects.toBe(
        failure,
      );
    });

    expect(storage.upsertRSIPNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: node.id, totalExecutions: 5 }),
    );
    expect(stateRef.getState().rsipNodes).toBe(originalNodes);
    expect(storage.appendRSIPExecutionRecord).not.toHaveBeenCalled();
    expect(onStartChain).not.toHaveBeenCalled();
  });

  it('keeps nodes and library unchanged until the atomic violation intent succeeds', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T08:00:00.000Z'));
    const node = createNode({ cumulativeExecutionDays: 12 });
    const originalNodes = [node];
    const originalLibrary: AppState['rsipPolicyLibrary'] = [];
    const stateRef = createStateContainer(
      createAppState({
        rsipNodes: originalNodes,
        rsipPolicyLibrary: originalLibrary,
      }),
    );
    const failure = new Error('atomic violation response unavailable');
    const archiveRSIPNodesAndRemove = vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(undefined);
    const storage = createLocalStorageMock({ archiveRSIPNodesAndRemove });
    const domain = useRsipDomain({
      setState: stateRef.setState,
      storage,
      getState: stateRef.getState,
    });
    const { result } = renderHook(() =>
      useRSIPViewInteractionActions({
        state: createState({ nodes: originalNodes }),
        props: createProps(domain.saveNodes, {
          onMarkViolated: domain.markViolated,
        }),
      }),
    );

    act(() => result.current.openViolationDialog(node));
    await act(async () => {
      await expect(
        result.current.handleConfirmViolation({ reasonCode: 'missed' }),
      ).rejects.toBe(failure);
    });

    expect(stateRef.getState().rsipNodes).toBe(originalNodes);
    expect(stateRef.getState().rsipPolicyLibrary).toBe(originalLibrary);
    expect(result.current.violationDialogNode).toBe(node);
    expect(storage.upsertRSIPLibraryEntry).not.toHaveBeenCalled();
    expect(storage.removeRSIPNodes).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.handleConfirmViolation({ reasonCode: 'missed' });
    });

    expect(stateRef.getState().rsipNodes).toEqual([]);
    expect(stateRef.getState().rsipPolicyLibrary).toEqual([
      expect.objectContaining({
        id: node.id,
        cumulativeExecutionDays: 12,
        timesUsed: 1,
      }),
    ]);
    expect(result.current.violationDialogNode).toBeNull();
    expect(archiveRSIPNodesAndRemove).toHaveBeenCalledTimes(2);
    expect(archiveRSIPNodesAndRemove.mock.calls[1]).toEqual(
      archiveRSIPNodesAndRemove.mock.calls[0],
    );
  });
});
