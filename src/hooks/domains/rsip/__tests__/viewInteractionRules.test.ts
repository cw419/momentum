import { describe, expect, it } from 'vitest';
import type {
  RSIPLibraryEntry,
  RSIPNode,
  RSIPNodeGroup,
  RSIPTaskLink,
} from '../../../../types';
import {
  assessViolationGroup,
  calculateConstraintPower,
  createNodeFromLibraryEntry,
  getActiveExecutionTaskLinks,
  getViolationDescendants,
  markNodeExecutedFallback,
  markNodeViolatedFallback,
} from '../viewInteractionRules';

const createdAt = new Date('2026-07-01T00:00:00.000Z');

function node(overrides: Partial<RSIPNode> = {}): RSIPNode {
  return {
    id: overrides.id ?? 'node-1',
    title: overrides.title ?? 'Policy',
    rule: overrides.rule ?? 'Rule',
    sortOrder: overrides.sortOrder ?? 1,
    createdAt: overrides.createdAt ?? createdAt,
    ...overrides,
  };
}

function link(overrides: Partial<RSIPTaskLink> = {}): RSIPTaskLink {
  return {
    id: overrides.id ?? 'link-1',
    rsipNodeId: overrides.rsipNodeId ?? 'node-1',
    chainId: overrides.chainId ?? 'chain-1',
    chainKind: overrides.chainKind ?? 'unit',
    triggerEvent: overrides.triggerEvent ?? 'rsip_mark_executed',
    effect: overrides.effect ?? 'prompt_start_chain',
    automation: overrides.automation ?? 'auto',
    isActive: overrides.isActive ?? true,
    updatedAt: overrides.updatedAt ?? createdAt,
  };
}

describe('RSIP view interaction rules', () => {
  it('selects only active task actions for the executed node', () => {
    const result = getActiveExecutionTaskLinks('node-1', [
      link(),
      link({ id: 'inactive', isActive: false }),
      link({ id: 'other-node', rsipNodeId: 'node-2' }),
      link({ id: 'task-event', triggerEvent: 'task_completed' }),
    ]);

    expect(result.map((item) => item.id)).toEqual(['link-1']);
  });

  it('distinguishes tolerated group loss from group collapse', () => {
    const group: RSIPNodeGroup = {
      id: 'group-1',
      title: 'Core',
      faultTolerance: 1,
      createdAt,
    };
    const nodes = [
      node({ id: 'node-1', groupId: group.id }),
      node({ id: 'node-2', groupId: group.id }),
    ];

    expect(assessViolationGroup(nodes[0], nodes, [group])).toEqual({
      status: 'tolerated',
      groupTitle: 'Core',
    });
    expect(
      assessViolationGroup(nodes[0], nodes, [{ ...group, faultTolerance: 0 }]),
    ).toEqual({ status: 'collapse', groupTitle: 'Core' });
  });

  it('returns no group assessment when the node is ungrouped', () => {
    expect(assessViolationGroup(node(), [node()], [])).toEqual({
      status: 'none',
    });
  });

  it('builds a restored node from a library entry with injected identity and time', () => {
    const entry: RSIPLibraryEntry = {
      id: 'library-1',
      title: 'Restored',
      rule: 'Restored rule',
      cumulativeExecutionDays: 5,
      internalizationProgress: 0.5,
      lastActiveAt: createdAt,
      timesUsed: 2,
      emoji: '🧭',
      isPassive: true,
    };

    const restoredAt = new Date('2026-07-11T12:00:00.123Z');
    expect(
      createNodeFromLibraryEntry(entry, 'parent-1', 'new-node', restoredAt),
    ).toEqual(
      expect.objectContaining({
        id: 'new-node',
        parentId: 'parent-1',
        title: 'Restored',
        rule: 'Restored rule',
        sortOrder: Math.floor(restoredAt.getTime() / 1000),
        createdAt: restoredAt,
        cumulativeExecutionDays: 5,
        emoji: '🧭',
        isPassive: true,
      }),
    );
  });

  it('calculates descendants and reinforcement-adjusted constraint power', () => {
    const nodes = [
      node({ id: 'root', stabilityPhase: 'E2', reinforcementLevel: 1 }),
      node({ id: 'child', parentId: 'root' }),
      node({ id: 'grandchild', parentId: 'child' }),
    ];

    expect(
      getViolationDescendants(nodes, 'root').map((item) => item.id),
    ).toEqual(['child', 'grandchild']);
    expect(calculateConstraintPower(nodes, 'root')).toEqual({
      descendantCount: 2,
      failureCost: 2.7,
    });
  });

  it('applies deterministic fallback execution and violation transitions', () => {
    const now = new Date('2026-07-11T12:00:00.000Z');
    const nodes = [
      node({ id: 'root', consecutiveExecutions: 6 }),
      node({ id: 'child', parentId: 'root' }),
      node({ id: 'other' }),
    ];

    const executed = markNodeExecutedFallback(nodes, 'root', now);
    expect(executed[0]).toEqual(
      expect.objectContaining({
        stabilityPhase: 'E1',
        phaseStartedAt: now,
        consecutiveExecutions: 7,
        totalExecutions: 1,
        lastExecutedAt: now,
      }),
    );
    expect(
      markNodeViolatedFallback(nodes, 'root').map((item) => item.id),
    ).toEqual(['other']);
  });
});
