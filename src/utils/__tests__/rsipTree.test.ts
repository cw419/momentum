import { describe, expect, it } from 'vitest';
import type { RSIPNode, RSIPTreeNode } from '../../types';
import {
  buildRSIPTree,
  countDescendants,
  deleteNodeAndDescendants,
  getDescendantCount,
  getDescendantIds,
} from '../rsipTree';

function node(overrides: Partial<RSIPNode>): RSIPNode {
  return {
    id: overrides.id ?? 'id',
    parentId: overrides.parentId,
    title: overrides.title ?? 'title',
    rule: overrides.rule ?? 'rule',
    sortOrder: overrides.sortOrder ?? 0,
    createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
  };
}

describe('rsipTree utilities', () => {
  it('builds a sorted tree and handles missing parent references as roots', () => {
    const nodes: RSIPNode[] = [
      node({ id: 'child-b', parentId: 'root', sortOrder: 2 }),
      node({ id: 'orphan', parentId: 'missing-parent', sortOrder: 3 }),
      node({ id: 'root', sortOrder: 1 }),
      node({ id: 'child-a', parentId: 'root', sortOrder: 1 }),
    ];

    const tree = buildRSIPTree(nodes);

    expect(tree.map((item) => item.id)).toEqual(['root', 'orphan']);
    expect(tree[0]?.children.map((item) => item.id)).toEqual(['child-a', 'child-b']);
    expect(tree[0]?.children[0]?.depth).toBe(1);
  });

  it('counts descendants recursively', () => {
    const treeNode: RSIPTreeNode = {
      ...node({ id: 'root' }),
      depth: 0,
      children: [
        {
          ...node({ id: 'child-1', parentId: 'root' }),
          depth: 1,
          children: [
            {
              ...node({ id: 'grand-child', parentId: 'child-1' }),
              depth: 2,
              children: [],
            },
          ],
        },
        {
          ...node({ id: 'child-2', parentId: 'root' }),
          depth: 1,
          children: [],
        },
      ],
    };

    expect(countDescendants(treeNode)).toBe(3);
  });

  it('removes a node and all descendants from a flat node list', () => {
    const nodes: RSIPNode[] = [
      node({ id: 'root' }),
      node({ id: 'child-1', parentId: 'root' }),
      node({ id: 'child-2', parentId: 'root' }),
      node({ id: 'grand-child', parentId: 'child-1' }),
      node({ id: 'other-root' }),
    ];

    const remaining = deleteNodeAndDescendants(nodes, 'child-1');

    expect(remaining.map((item) => item.id)).toEqual(['root', 'child-2', 'other-root']);
  });

  it('returns descendant ids and count for a node', () => {
    const nodes: RSIPNode[] = [
      node({ id: 'root' }),
      node({ id: 'child-1', parentId: 'root' }),
      node({ id: 'child-2', parentId: 'root' }),
      node({ id: 'grand-child', parentId: 'child-1' }),
    ];

    const descendantIds = getDescendantIds(nodes, 'root');

    expect(descendantIds).toEqual(['child-1', 'grand-child', 'child-2']);
    expect(getDescendantCount(nodes, 'root')).toBe(3);
    expect(getDescendantCount(nodes, 'missing')).toBe(0);
  });
});
