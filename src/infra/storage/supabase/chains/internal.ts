import type { Chain } from '../../../../types';
import { formatSupabaseError, getSupabaseErrorCode } from '../supabaseError';

export function formatDbError(error: unknown): string {
  return formatSupabaseError(error, 'Unknown error');
}

export function isMissingDeletedAtColumnError(error: unknown): boolean {
  const msg = formatSupabaseError(error, '').toLowerCase();
  const code = getSupabaseErrorCode(error) ?? '';
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    msg.includes('deleted_at') ||
    msg.includes('schema cache') ||
    (msg.includes('column') && msg.includes('does not exist'))
  );
}

export function findChainAndChildren(
  chainId: string,
  allChains: Chain[],
): Chain[] {
  // 预构建 Map 查找表，将 O(n²) 降为 O(n)
  const chainById = new Map(allChains.map((c) => [c.id, c]));
  const childrenByParentId = new Map<string, Chain[]>();

  for (const chain of allChains) {
    const parentId = chain.parentId || '';
    const children = childrenByParentId.get(parentId) || [];
    children.push(chain);
    childrenByParentId.set(parentId, children);
  }

  const result: Chain[] = [];
  const visited = new Set<string>();

  const findRecursive = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);

    const chain = chainById.get(id);
    if (chain) {
      result.push(chain);
      const children = childrenByParentId.get(id) || [];
      children.forEach((child) => findRecursive(child.id));
    }
  };

  findRecursive(chainId);
  return result;
}
