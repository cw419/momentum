import { describe, expect, it } from 'vitest';
import type { RSIPNode, RSIPNodeGroup } from '../../types';
import {
  assignGroupParent,
  canAssignGroupParent,
  getInheritedGroupId,
  moveNodeSubtreeToGroup,
} from '../rsipGroupRelations';

function node(overrides: Partial<RSIPNode>): RSIPNode {
  return {
    id: 'node',
    title: 'Policy',
    rule: 'Rule',
    sortOrder: 0,
    createdAt: new Date('2026-09-02T00:00:00.000Z'),
    ...overrides,
  };
}

function group(id: string, parentGroupId?: string): RSIPNodeGroup {
  return {
    id,
    parentGroupId,
    title: id,
    faultTolerance: 0,
    createdAt: new Date('2026-09-02T00:00:00.000Z'),
  };
}

describe('rsip group relations', () => {
  it('inherits the parent group when creating a child node', () => {
    const nodes = [node({ id: 'parent', groupId: 'group-a' })];

    expect(getInheritedGroupId(nodes, 'parent', 'group-b')).toBe('group-a');
    expect(getInheritedGroupId(nodes, undefined, 'group-b')).toBe('group-b');
  });

  it('moves an entire node subtree into a group', () => {
    const nodes = [
      node({ id: 'root', groupId: 'group-a' }),
      node({ id: 'child', parentId: 'root', groupId: 'group-a' }),
      node({ id: 'grandchild', parentId: 'child', groupId: 'group-a' }),
      node({ id: 'outside', groupId: 'group-a' }),
    ];

    expect(moveNodeSubtreeToGroup(nodes, 'child', 'group-b')).toEqual([
      nodes[0],
      { ...nodes[1], groupId: 'group-b' },
      { ...nodes[2], groupId: 'group-b' },
      nodes[3],
    ]);
  });

  it('allows a group forest while preventing cycles', () => {
    const groups = [
      group('group-a'),
      group('group-b', 'group-a'),
      group('group-c', 'group-b'),
    ];

    expect(canAssignGroupParent(groups, 'group-c', 'group-a')).toBe(true);
    expect(canAssignGroupParent(groups, 'group-a', 'group-c')).toBe(false);
    expect(assignGroupParent(groups, 'group-c', 'group-a')).toMatchObject([
      { id: 'group-a' },
      { id: 'group-b', parentGroupId: 'group-a' },
      { id: 'group-c', parentGroupId: 'group-a' },
    ]);
  });
});
