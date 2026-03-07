import { describe, expect, it, vi } from 'vitest';
import {
  getFallbackUpdatedNodesForExecuted,
  getFallbackUpdatedNodesForViolation,
  getSplitTemplates,
} from '../rsipViewHelpers';
import type { RSIPNode } from '../../../types';

function createNode(overrides: Partial<RSIPNode> = {}): RSIPNode {
  return {
    id: overrides.id ?? 'node-id',
    title: overrides.title ?? 'Node',
    rule: overrides.rule ?? 'Rule',
    sortOrder: overrides.sortOrder ?? 0,
    createdAt: overrides.createdAt ?? new Date('2026-02-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('rsipViewHelpers', () => {
  it('returns localized split templates', () => {
    const zhTemplates = getSplitTemplates('zh-CN');
    const enTemplates = getSplitTemplates('en');

    expect(zhTemplates.sleep.goal).toBe('早睡早起');
    expect(enTemplates.sleep.goal).toBe('Sleep early and wake early');
    expect(zhTemplates.exercise.items).toHaveLength(2);
  });

  it('builds fallback executed nodes with phase progression', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T09:00:00.000Z'));

    const [updated] = getFallbackUpdatedNodesForExecuted(
      [
        createNode({
          id: 'node-1',
          stabilityPhase: 'E0',
          consecutiveExecutions: 6,
          totalExecutions: 3,
        }),
      ],
      'node-1',
    );

    expect(updated).toMatchObject({
      id: 'node-1',
      stabilityPhase: 'E1',
      consecutiveExecutions: 7,
      consecutiveViolations: 0,
      totalExecutions: 4,
      cumulativeExecutionDays: 1,
    });
    expect(updated.phaseStartedAt).toEqual(new Date('2026-03-07T09:00:00.000Z'));
  });

  it('removes the violated node and its descendants in fallback mode', () => {
    const remaining = getFallbackUpdatedNodesForViolation(
      [
        createNode({ id: 'root' }),
        createNode({ id: 'child', parentId: 'root' }),
        createNode({ id: 'sibling' }),
      ],
      'root',
    );

    expect(remaining).toEqual([expect.objectContaining({ id: 'sibling' })]);
  });
});
