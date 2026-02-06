import type { Chain } from '../../types';

export function collectDescendantIds(rootId: string, allChains: Chain[]): Set<string> {
  const childrenByParentId = new Map<string, string[]>();

  for (const chain of allChains) {
    const parentId = chain.parentId;
    if (!parentId) continue;

    const bucket = childrenByParentId.get(parentId) ?? [];
    bucket.push(chain.id);
    childrenByParentId.set(parentId, bucket);
  }

  const descendants = new Set<string>();
  const stack = [...(childrenByParentId.get(rootId) ?? [])];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId) continue;
    if (descendants.has(currentId)) continue;

    descendants.add(currentId);
    const children = childrenByParentId.get(currentId);
    if (children) stack.push(...children);
  }

  return descendants;
}

