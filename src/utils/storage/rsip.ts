import type { RSIPMeta, RSIPNode } from '../../types';
import { STORAGE_KEYS } from './keys';

interface RawNodeData {
  createdAt: string;
}

export function getRSIPNodes(): RSIPNode[] {
  const data = localStorage.getItem(STORAGE_KEYS.RSIP_NODES);
  if (!data) return [];

  return JSON.parse(data).map(
    (node: RawNodeData & Record<string, unknown>) => ({
      ...node,
      createdAt: new Date(node.createdAt),
    }),
  );
}

export function saveRSIPNodes(nodes: RSIPNode[]): void {
  localStorage.setItem(STORAGE_KEYS.RSIP_NODES, JSON.stringify(nodes));
}

export function getRSIPMeta(): RSIPMeta {
  const data = localStorage.getItem(STORAGE_KEYS.RSIP_META);
  if (!data) return {};

  const parsed = JSON.parse(data) as {
    lastAddedAt?: string;
    allowMultiplePerDay?: boolean;
  };
  return {
    lastAddedAt: parsed.lastAddedAt ? new Date(parsed.lastAddedAt) : undefined,
    allowMultiplePerDay: !!parsed.allowMultiplePerDay,
  } as RSIPMeta;
}

export function saveRSIPMeta(meta: RSIPMeta): void {
  localStorage.setItem(
    STORAGE_KEYS.RSIP_META,
    JSON.stringify({
      ...meta,
      lastAddedAt: meta.lastAddedAt
        ? meta.lastAddedAt.toISOString()
        : undefined,
      allowMultiplePerDay: !!meta.allowMultiplePerDay,
    }),
  );
}
