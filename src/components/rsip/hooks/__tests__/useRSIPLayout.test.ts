import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RSIPNode } from '../../../../types';
import { buildRSIPTree } from '../../../../utils/rsipTree';
import { useRSIPLayout } from '../useRSIPLayout';

function createNode(overrides: Partial<RSIPNode>): RSIPNode {
  return {
    id: overrides.id ?? 'node',
    title: overrides.title ?? 'Policy',
    rule: overrides.rule ?? 'Rule',
    sortOrder: overrides.sortOrder ?? 0,
    createdAt: overrides.createdAt ?? new Date('2026-08-23T00:00:00.000Z'),
    ...overrides,
  };
}

describe('useRSIPLayout', () => {
  it('frames independent group members and arranges them in a row', async () => {
    const nodes = [
      createNode({ id: 'first', title: 'First', groupId: 'group-1' }),
      createNode({ id: 'second', title: 'Second', groupId: 'group-1' }),
      createNode({ id: 'outside', title: 'Outside' }),
    ];
    const groups = [
      {
        id: 'group-1',
        title: 'Core policies',
        emoji: '🧭',
        faultTolerance: 1,
        createdAt: new Date('2026-08-23T00:00:00.000Z'),
      },
    ];
    const tree = buildRSIPTree(nodes);

    const { result } = renderHook(() =>
      useRSIPLayout(nodes, tree, null, groups),
    );

    await waitFor(() => {
      expect(result.current.groupFrames).toHaveLength(1);
    });

    expect(result.current.nodePositions.first?.style.top).toBe(
      result.current.nodePositions.second?.style.top,
    );
    expect(result.current.nodePositions.first?.style.left).toBe(20);
    expect(result.current.nodePositions.second?.style.left).toBe(340);
    expect(result.current.groupFrames[0]).toMatchObject({
      id: 'group-1',
      title: 'Core policies',
      emoji: '🧭',
    });
  });

  it('stacks inherited group members vertically', async () => {
    const nodes = [
      createNode({ id: 'parent', groupId: 'group-1' }),
      createNode({ id: 'child', parentId: 'parent', groupId: 'group-1' }),
    ];
    const groups = [
      {
        id: 'group-1',
        title: 'Nested policies',
        faultTolerance: 0,
        createdAt: new Date('2026-08-23T00:00:00.000Z'),
      },
    ];
    const tree = buildRSIPTree(nodes);

    const { result } = renderHook(() =>
      useRSIPLayout(nodes, tree, null, groups),
    );

    await waitFor(() => {
      expect(result.current.groupFrames).toHaveLength(1);
    });

    expect(result.current.nodePositions.parent?.style.left).toBe(20);
    expect(result.current.nodePositions.child?.style.left).toBe(20);
    expect(result.current.nodePositions.parent?.style.top).toBe(20);
    expect(result.current.nodePositions.child?.style.top).toBe(240);
  });

  it('keeps independent branches side by side while stacking each branch', async () => {
    const nodes = [
      createNode({ id: 'parent', groupId: 'group-1', sortOrder: 1 }),
      createNode({
        id: 'child',
        parentId: 'parent',
        groupId: 'group-1',
        sortOrder: 2,
      }),
      createNode({ id: 'independent', groupId: 'group-1', sortOrder: 3 }),
    ];
    const groups = [
      {
        id: 'group-1',
        title: 'Mixed policies',
        faultTolerance: 0,
        createdAt: new Date('2026-08-23T00:00:00.000Z'),
      },
    ];
    const tree = buildRSIPTree(nodes);

    const { result } = renderHook(() =>
      useRSIPLayout(nodes, tree, null, groups),
    );

    await waitFor(() => {
      expect(result.current.groupFrames).toHaveLength(1);
    });

    expect(result.current.nodePositions.parent?.style).toMatchObject({
      left: 20,
      top: 20,
    });
    expect(result.current.nodePositions.child?.style).toMatchObject({
      left: 20,
      top: 240,
    });
    expect(result.current.nodePositions.independent?.style).toMatchObject({
      left: 340,
      top: 20,
    });
  });
});
