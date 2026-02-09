import { describe, expect, it } from 'vitest';
import type { RSIPExecutionRecord, RSIPNode, RSIPRunRecord } from '../../../types';
import { buildRSIPInsights } from '../RSIPInsightsService';

function createNode(overrides: Partial<RSIPNode> = {}): RSIPNode {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? 'Node',
    rule: overrides.rule ?? 'Do it',
    sortOrder: overrides.sortOrder ?? 1,
    createdAt: overrides.createdAt ?? new Date('2026-02-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createExecutionRecord(
  overrides: Partial<RSIPExecutionRecord> = {},
): RSIPExecutionRecord {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    nodeId: overrides.nodeId ?? 'node-a',
    executedAt: overrides.executedAt ?? new Date('2026-02-08T00:00:00.000Z'),
    status: overrides.status ?? 'executed',
    ...overrides,
  };
}

function createRun(overrides: Partial<RSIPRunRecord> = {}): RSIPRunRecord {
  return {
    runNumber: overrides.runNumber ?? 1,
    startedAt: overrides.startedAt ?? new Date('2026-01-01T00:00:00.000Z'),
    endedAt: overrides.endedAt ?? new Date('2026-01-03T00:00:00.000Z'),
    maxNodeCount: overrides.maxNodeCount ?? 3,
    durationDays: overrides.durationDays ?? 3,
    ...overrides,
  };
}

describe('buildRSIPInsights', () => {
  it('produces rural-first recommendation for high-risk violated node', () => {
    const root = createNode({
      id: 'root',
      title: 'Sleep schedule rebuild',
      stabilityPhase: 'E2',
    });
    const child = createNode({
      id: 'child',
      parentId: 'root',
      title: 'Morning wake-up',
      stabilityPhase: 'E0',
    });

    const result = buildRSIPInsights({
      nodes: [root, child],
      runHistory: [createRun()],
      executionRecords: [
        createExecutionRecord({
          nodeId: 'root',
          status: 'violated',
          executedAt: new Date('2026-02-08T00:00:00.000Z'),
        }),
        createExecutionRecord({
          nodeId: 'root',
          status: 'violated',
          executedAt: new Date('2026-02-07T00:00:00.000Z'),
        }),
      ],
      groups: [],
      taskLinks: [],
      policyLibrary: [],
      now: new Date('2026-02-09T00:00:00.000Z'),
    });

    expect(result.recommendations.some((item) => item.kind === 'rural_first')).toBe(
      true,
    );
    expect(result.riskNodes[0]?.nodeId).toBe('root');
  });

  it('reports link recommendation when no active links exist', () => {
    const node = createNode({ id: 'node-a', title: 'Low cost policy' });
    const result = buildRSIPInsights({
      nodes: [node],
      runHistory: [],
      executionRecords: [
        createExecutionRecord({
          nodeId: 'node-a',
          status: 'executed',
          executedAt: new Date('2026-02-08T00:00:00.000Z'),
        }),
      ],
      groups: [],
      taskLinks: [],
      policyLibrary: [],
      now: new Date('2026-02-09T00:00:00.000Z'),
    });

    expect(result.summary.linkCount).toBe(0);
    expect(result.recommendations.some((item) => item.kind === 'automation')).toBe(
      true,
    );
  });

  it('computes run trends from history', () => {
    const node = createNode({ id: 'node-a' });
    const runs: RSIPRunRecord[] = [
      createRun({ runNumber: 1, maxNodeCount: 2, durationDays: 2 }),
      createRun({ runNumber: 2, maxNodeCount: 4, durationDays: 3 }),
      createRun({ runNumber: 3, maxNodeCount: 6, durationDays: 5 }),
    ];

    const result = buildRSIPInsights({
      nodes: [node],
      runHistory: runs,
      executionRecords: [],
      groups: [],
      taskLinks: [{ id: 'l1', rsipNodeId: 'node-a', chainId: 'c1', chainKind: 'unit', triggerEvent: 'task_completed', effect: 'mark_rsip_executed', automation: 'auto', isActive: true, updatedAt: new Date('2026-02-08T00:00:00.000Z') }],
      policyLibrary: [],
      now: new Date('2026-02-09T00:00:00.000Z'),
    });

    expect(result.trends.maxNodeTrend).toBe('up');
    expect(result.trends.runDurationTrend).toBe('up');
  });
});

