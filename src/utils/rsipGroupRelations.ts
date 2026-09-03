import type { RSIPNode, RSIPNodeGroup } from '../types';
import { getDescendantIds } from './rsipTree';

export function getInheritedGroupId(
  nodes: RSIPNode[],
  parentId: string | undefined,
  fallbackGroupId?: string,
): string | undefined {
  if (!parentId) return fallbackGroupId;
  return nodes.find((node) => node.id === parentId)?.groupId;
}

export function moveNodeSubtreeToGroup(
  nodes: RSIPNode[],
  nodeId: string,
  groupId?: string,
): RSIPNode[] {
  const subtreeIds = new Set([nodeId, ...getDescendantIds(nodes, nodeId)]);
  return nodes.map((node) =>
    subtreeIds.has(node.id) ? { ...node, groupId } : node,
  );
}

export function getGroupDescendantIds(
  groups: RSIPNodeGroup[],
  groupId: string,
): string[] {
  const childrenByParent = new Map<string, string[]>();
  groups.forEach((group) => {
    if (!group.parentGroupId) return;
    const children = childrenByParent.get(group.parentGroupId) ?? [];
    children.push(group.id);
    childrenByParent.set(group.parentGroupId, children);
  });

  const descendants: string[] = [];
  const visit = (parentId: string) => {
    for (const childId of childrenByParent.get(parentId) ?? []) {
      descendants.push(childId);
      visit(childId);
    }
  };
  visit(groupId);
  return descendants;
}

export function canAssignGroupParent(
  groups: RSIPNodeGroup[],
  groupId: string,
  parentGroupId?: string,
): boolean {
  if (!parentGroupId) return true;
  if (groupId === parentGroupId) return false;
  return !getGroupDescendantIds(groups, groupId).includes(parentGroupId);
}

export function assignGroupParent(
  groups: RSIPNodeGroup[],
  groupId: string,
  parentGroupId?: string,
): RSIPNodeGroup[] {
  if (!canAssignGroupParent(groups, groupId, parentGroupId)) {
    return groups;
  }
  return groups.map((group) =>
    group.id === groupId ? { ...group, parentGroupId } : group,
  );
}
