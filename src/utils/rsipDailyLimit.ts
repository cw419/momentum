import type { RSIPMeta, RSIPNode } from '../types';

function toValidDate(value: Date | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getLatestNodeCreatedAt(nodes: RSIPNode[]): Date | undefined {
  let latest: Date | undefined;

  for (const node of nodes) {
    const createdAt = toValidDate(node.createdAt);
    if (createdAt && (!latest || createdAt.getTime() > latest.getTime())) {
      latest = createdAt;
    }
  }

  return latest;
}

export function getEffectiveRSIPLastAddedAt(
  meta: RSIPMeta,
  nodes: RSIPNode[],
): Date | undefined {
  const metaLastAddedAt = toValidDate(meta.lastAddedAt);
  const latestNodeCreatedAt = getLatestNodeCreatedAt(nodes);

  if (!metaLastAddedAt) {
    return latestNodeCreatedAt;
  }
  if (!latestNodeCreatedAt) {
    return metaLastAddedAt;
  }

  return metaLastAddedAt.getTime() >= latestNodeCreatedAt.getTime()
    ? metaLastAddedAt
    : latestNodeCreatedAt;
}

export function reconcileRSIPMetaWithNodes(
  meta: RSIPMeta,
  nodes: RSIPNode[],
): RSIPMeta {
  const effectiveLastAddedAt = getEffectiveRSIPLastAddedAt(meta, nodes);
  const currentLastAddedAt = toValidDate(meta.lastAddedAt);

  if (
    !effectiveLastAddedAt ||
    currentLastAddedAt?.getTime() === effectiveLastAddedAt.getTime()
  ) {
    return meta;
  }

  return { ...meta, lastAddedAt: effectiveLastAddedAt };
}

export function wasRSIPAddedToday(
  meta: RSIPMeta,
  nodes: RSIPNode[],
  now = new Date(),
): boolean {
  const lastAddedAt = getEffectiveRSIPLastAddedAt(meta, nodes);
  return lastAddedAt?.toDateString() === now.toDateString();
}
