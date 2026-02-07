import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState, RSIPMeta, RSIPNode } from '../../../types';
import { useRsipDomain } from '../useRsipDomain';
import { createAppState, createLocalStorageMock } from '../../../test/factories';
import { logger } from '../../../utils/logger';

vi.mock('../../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

function createBaseState(): AppState {
  return createAppState();
}

function createStateContainer(initialState: AppState) {
  let state = initialState;
  const setState: Dispatch<SetStateAction<AppState>> = (update) => {
    state = typeof update === 'function' ? (update as (prev: AppState) => AppState)(state) : update;
  };
  return {
    getState: () => state,
    setState,
  };
}

function createNode(overrides: Partial<RSIPNode> = {}): RSIPNode {
  return {
    id: overrides.id ?? 'node-id',
    parentId: overrides.parentId,
    title: overrides.title ?? 'Node',
    rule: overrides.rule ?? 'Rule',
    sortOrder: overrides.sortOrder ?? 1,
    createdAt: overrides.createdAt ?? new Date('2026-02-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('useRsipDomain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('optimistically updates rsipNodes before persistence resolves', async () => {
    const stateRef = createStateContainer(createBaseState());

    let resolveSave!: () => void;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });

    const storage = createLocalStorageMock({
      saveRSIPNodes: vi.fn().mockReturnValue(savePromise),
    });

    const domain = useRsipDomain({ setState: stateRef.setState, storage });

    const nodes: RSIPNode[] = [
      createNode({ id: 'rsip-1', title: 'Test', rule: 'Test rule' }),
    ];

    const pending = domain.saveNodes(nodes);

    expect(stateRef.getState().rsipNodes).toEqual(nodes);

    resolveSave();
    await pending;

    expect(storage.saveRSIPNodes).toHaveBeenCalledWith(nodes);
  });

  it('does not throw when persistence fails', async () => {
    const stateRef = createStateContainer(createBaseState());

    const storage = createLocalStorageMock({
      saveRSIPNodes: vi.fn().mockRejectedValue(new Error('persist failed')),
    });

    const domain = useRsipDomain({ setState: stateRef.setState, storage });

    const nodes: RSIPNode[] = [
      createNode({ id: 'rsip-1', title: 'Test', rule: 'Test rule' }),
    ];

    await expect(domain.saveNodes(nodes)).resolves.toBeUndefined();
    expect(stateRef.getState().rsipNodes).toEqual(nodes);
    expect(logger.error).toHaveBeenCalledWith(
      'RSIP',
      'Failed to save RSIP nodes',
      { nodeCount: 1 },
      expect.any(Error)
    );
  });

  it('should open RSIP view and optimistically persist meta', async () => {
    const stateRef = createStateContainer(createBaseState());
    const storage = createLocalStorageMock({
      saveRSIPMeta: vi.fn(async () => {
        throw new Error('meta persist failed');
      }),
    });
    const domain = useRsipDomain({ setState: stateRef.setState, storage });

    domain.openRSIP();
    expect(stateRef.getState().currentView).toBe('rsip');

    const meta: RSIPMeta = { allowMultiplePerDay: false, treeOpenStreak: 2 };
    await expect(domain.saveMeta(meta)).resolves.toBeUndefined();
    expect(stateRef.getState().rsipMeta).toEqual(meta);
    expect(logger.error).toHaveBeenCalledWith('RSIP', 'Failed to save RSIP meta', { meta }, expect.any(Error));
  });

  it('should provide strict/free mode helpers and opened-today check', () => {
    const domain = useRsipDomain({ setState: vi.fn(), storage: createLocalStorageMock() });
    const strictMeta: RSIPMeta = { allowMultiplePerDay: false };
    const freeMeta: RSIPMeta = { allowMultiplePerDay: true };

    expect(domain.getMode(strictMeta)).toBe('strict');
    expect(domain.getMode(freeMeta)).toBe('free');
    expect(domain.isStrictMode(strictMeta)).toBe(true);
    expect(domain.isStrictMode(freeMeta)).toBe(false);
    expect(domain.hasOpenedToday({})).toBe(false);
    expect(domain.hasOpenedToday({ lastTreeOpenedAt: new Date() })).toBe(true);
  });

  it('should mark execution and advance phase from E0 to E1', async () => {
    const storage = createLocalStorageMock({
      saveRSIPNodes: vi.fn(async () => undefined),
    });
    const domain = useRsipDomain({ setState: vi.fn(), storage });
    const nodes = [
      createNode({
        id: 'exec-e0',
        stabilityPhase: 'E0',
        consecutiveExecutions: 6,
        consecutiveViolations: 2,
        totalExecutions: 4,
      }),
    ];

    const updated = await domain.markExecuted('exec-e0', nodes);
    const node = updated[0];

    expect(node.consecutiveExecutions).toBe(7);
    expect(node.totalExecutions).toBe(5);
    expect(node.consecutiveViolations).toBe(0);
    expect(node.stabilityPhase).toBe('E1');
    expect(node.phaseStartedAt).toBeInstanceOf(Date);
  });

  it('should update only target node when marking execution', async () => {
    const storage = createLocalStorageMock({
      saveRSIPNodes: vi.fn(async () => undefined),
    });
    const domain = useRsipDomain({ setState: vi.fn(), storage });
    const target = createNode({
      id: 'exec-target',
      stabilityPhase: 'E0',
      consecutiveExecutions: 1,
      totalExecutions: 2,
    });
    const untouched = createNode({
      id: 'exec-untouched',
      stabilityPhase: 'E1',
      consecutiveExecutions: 9,
      totalExecutions: 9,
    });

    const updated = await domain.markExecuted('exec-target', [target, untouched]);
    expect(updated.find((node) => node.id === 'exec-target')?.consecutiveExecutions).toBe(2);
    expect(updated.find((node) => node.id === 'exec-untouched')).toEqual(untouched);
  });

  it('should not transition stability phase before threshold and should not transition E0 directly to E2', async () => {
    const storage = createLocalStorageMock({
      saveRSIPNodes: vi.fn(async () => undefined),
    });
    const domain = useRsipDomain({ setState: vi.fn(), storage });

    const e0BelowThreshold = createNode({
      id: 'e0-below',
      stabilityPhase: 'E0',
      consecutiveExecutions: 3,
      totalExecutions: 3,
    });
    const e0HighExecutions = createNode({
      id: 'e0-high',
      stabilityPhase: 'E0',
      consecutiveExecutions: 30,
      totalExecutions: 30,
    });
    const e1BelowThreshold = createNode({
      id: 'e1-below',
      stabilityPhase: 'E1',
      consecutiveExecutions: 10,
      totalExecutions: 10,
    });

    const updatedE0 = await domain.markExecuted('e0-below', [e0BelowThreshold]);
    expect(updatedE0[0].stabilityPhase).toBe('E0');

    const updatedE0High = await domain.markExecuted('e0-high', [e0HighExecutions]);
    expect(updatedE0High[0].stabilityPhase).toBe('E1');

    const updatedE1 = await domain.markExecuted('e1-below', [e1BelowThreshold]);
    expect(updatedE1[0].stabilityPhase).toBe('E1');
  });

  it('should mark execution and advance phase from E1 to E2', async () => {
    const storage = createLocalStorageMock({
      saveRSIPNodes: vi.fn(async () => undefined),
    });
    const domain = useRsipDomain({ setState: vi.fn(), storage });
    const nodes = [
      createNode({
        id: 'exec-e1',
        stabilityPhase: 'E1',
        consecutiveExecutions: 20,
        totalExecutions: 20,
      }),
    ];

    const updated = await domain.markExecuted('exec-e1', nodes);
    expect(updated[0].stabilityPhase).toBe('E2');
    expect(updated[0].consecutiveExecutions).toBe(21);
    expect(updated[0].totalExecutions).toBe(21);
  });

  it('should treat undefined stability phase as E0 when marking execution', async () => {
    const storage = createLocalStorageMock({
      saveRSIPNodes: vi.fn(async () => undefined),
    });
    const domain = useRsipDomain({ setState: vi.fn(), storage });
    const nodes = [
      createNode({
        id: 'exec-undefined-phase',
        stabilityPhase: undefined,
        consecutiveExecutions: 6,
        totalExecutions: 12,
      }),
    ];

    const updated = await domain.markExecuted('exec-undefined-phase', nodes);
    expect(updated[0].stabilityPhase).toBe('E1');
    expect(updated[0].consecutiveExecutions).toBe(7);
    expect(updated[0].totalExecutions).toBe(13);
    expect(updated[0].phaseStartedAt).toBeInstanceOf(Date);
  });

  it('should keep E2 node phase unchanged when marking execution', async () => {
    const storage = createLocalStorageMock({
      saveRSIPNodes: vi.fn(async () => undefined),
    });
    const domain = useRsipDomain({ setState: vi.fn(), storage });
    const originalPhaseStartedAt = new Date('2026-01-15T00:00:00.000Z');
    const nodes = [
      createNode({
        id: 'exec-e2-stable',
        stabilityPhase: 'E2',
        consecutiveExecutions: 4,
        totalExecutions: 9,
        phaseStartedAt: originalPhaseStartedAt,
      }),
    ];

    const updated = await domain.markExecuted('exec-e2-stable', nodes);
    expect(updated[0].stabilityPhase).toBe('E2');
    expect(updated[0].phaseStartedAt).toEqual(originalPhaseStartedAt);
    expect(updated[0].consecutiveExecutions).toBe(5);
    expect(updated[0].totalExecutions).toBe(10);
  });

  it('should not reset E2 phase start when high execution count is already reached', async () => {
    const storage = createLocalStorageMock({
      saveRSIPNodes: vi.fn(async () => undefined),
    });
    const domain = useRsipDomain({ setState: vi.fn(), storage });
    const originalPhaseStartedAt = new Date('2026-01-01T00:00:00.000Z');
    const nodes = [
      createNode({
        id: 'exec-e2-high',
        stabilityPhase: 'E2',
        consecutiveExecutions: 21,
        totalExecutions: 30,
        phaseStartedAt: originalPhaseStartedAt,
      }),
    ];

    const updated = await domain.markExecuted('exec-e2-high', nodes);
    expect(updated[0].stabilityPhase).toBe('E2');
    expect(updated[0].phaseStartedAt).toEqual(originalPhaseStartedAt);
    expect(updated[0].consecutiveExecutions).toBe(22);
    expect(updated[0].totalExecutions).toBe(31);
  });

  it('should delete violated node with all descendants', async () => {
    const storage = createLocalStorageMock({
      saveRSIPNodes: vi.fn(async () => undefined),
    });
    const domain = useRsipDomain({ setState: vi.fn(), storage });
    const root = createNode({ id: 'root' });
    const child = createNode({ id: 'child', parentId: root.id });
    const grandChild = createNode({ id: 'grand', parentId: child.id });
    const keep = createNode({ id: 'keep' });

    const updated = await domain.markViolated(root.id, [root, child, grandChild, keep]);
    expect(updated).toEqual([keep]);
  });

  it('should record tree opened streak with increment and reset behavior', async () => {
    const storage = createLocalStorageMock({
      saveRSIPMeta: vi.fn(async () => undefined),
    });
    const domain = useRsipDomain({ setState: vi.fn(), storage });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const incremented = await domain.recordTreeOpened({
      lastTreeOpenedAt: yesterday,
      treeOpenStreak: 3,
    });
    expect(incremented.treeOpenStreak).toBe(4);

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 7);
    const reset = await domain.recordTreeOpened({
      lastTreeOpenedAt: oldDate,
      treeOpenStreak: 9,
    });
    expect(reset.treeOpenStreak).toBe(1);
  });

  it('should initialize streak when no last open date and keep streak when reopened on same day', async () => {
    const storage = createLocalStorageMock({
      saveRSIPMeta: vi.fn(async () => undefined),
    });
    const domain = useRsipDomain({ setState: vi.fn(), storage });

    const initialized = await domain.recordTreeOpened({ allowMultiplePerDay: false });
    expect(initialized.treeOpenStreak).toBe(1);

    const sameDay = await domain.recordTreeOpened({
      allowMultiplePerDay: false,
      lastTreeOpenedAt: new Date(),
      treeOpenStreak: 5,
    });
    expect(sameDay.treeOpenStreak).toBe(5);
  });

  it('should calculate constraint power and phase distribution', () => {
    const domain = useRsipDomain({ setState: vi.fn(), storage: createLocalStorageMock() });
    const root = createNode({ id: 'cp-root', stabilityPhase: 'E2' });
    const child1 = createNode({ id: 'cp-child-1', parentId: root.id, stabilityPhase: 'E1' });
    const child2 = createNode({ id: 'cp-child-2', parentId: root.id, stabilityPhase: 'E0' });
    const child3 = createNode({ id: 'cp-child-3', parentId: root.id, stabilityPhase: undefined });
    const nodes = [root, child1, child2, child3];

    expect(domain.calculateConstraintPower('missing', nodes)).toEqual({
      descendantCount: 0,
      failureCost: 0,
    });
    expect(domain.calculateConstraintPower(root.id, nodes)).toEqual({
      descendantCount: 3,
      failureCost: 12,
    });

    expect(domain.calculatePhaseDistribution(nodes)).toEqual({
      E0: 2,
      E1: 1,
      E2: 1,
    });
  });

  it('should report hasOpenedToday false for stale dates', () => {
    const domain = useRsipDomain({ setState: vi.fn(), storage: createLocalStorageMock() });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    expect(domain.hasOpenedToday({ lastTreeOpenedAt: yesterday })).toBe(false);
  });
});
