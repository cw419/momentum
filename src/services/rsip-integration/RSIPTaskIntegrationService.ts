import type { RSIPTaskLink } from '../../types/rsipIntegration';

export type RSIPIntegrationEvent = RSIPTaskLink['triggerEvent'];

export interface RSIPTaskEventPayload {
  event: RSIPIntegrationEvent;
  chainId: string;
  chainKind: RSIPTaskLink['chainKind'];
  occurredAt?: Date;
}

export interface RSIPTaskEventLinkMatch {
  link: RSIPTaskLink;
  deduped: boolean;
}

function toDateValue(value: Date | string | number | undefined): number {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? 0 : value.getTime();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }
  return 0;
}

function toDateOnlyKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildLinkUniqueKey(link: RSIPTaskLink): string {
  return [
    link.userId ?? '',
    link.rsipNodeId,
    link.chainId,
    link.triggerEvent,
    link.effect,
  ].join(':');
}

function buildEventDedupKey(
  link: RSIPTaskLink,
  event: RSIPIntegrationEvent,
  dateOnly: string,
): string {
  return `${buildLinkUniqueKey(link)}:${event}:${dateOnly}`;
}

function isTaskToRsipEffect(effect: RSIPTaskLink['effect']): boolean {
  return effect === 'mark_rsip_executed' || effect === 'mark_rsip_violated';
}

function isRsipToTaskEffect(effect: RSIPTaskLink['effect']): boolean {
  return effect === 'prompt_start_chain' || effect === 'prompt_schedule_chain';
}

export class RSIPTaskIntegrationService {
  private readonly processedEventKeys = new Set<string>();

  resolveLatestLinks(links: RSIPTaskLink[]): RSIPTaskLink[] {
    const map = new Map<string, RSIPTaskLink>();

    for (const link of links) {
      const uniqueKey = buildLinkUniqueKey(link);
      const existing = map.get(uniqueKey);
      if (!existing) {
        map.set(uniqueKey, link);
        continue;
      }

      if (toDateValue(link.updatedAt) >= toDateValue(existing.updatedAt)) {
        map.set(uniqueKey, link);
      }
    }

    return [...map.values()];
  }

  upsertLinks(
    existingLinks: RSIPTaskLink[],
    incomingLinks: RSIPTaskLink[],
  ): RSIPTaskLink[] {
    return this.resolveLatestLinks([...existingLinks, ...incomingLinks]);
  }

  matchTaskEventLinks(
    allLinks: RSIPTaskLink[],
    payload: RSIPTaskEventPayload,
  ): RSIPTaskEventLinkMatch[] {
    const occurredAt = payload.occurredAt ?? new Date();
    const dateOnly = toDateOnlyKey(occurredAt);

    const matches: RSIPTaskEventLinkMatch[] = [];
    for (const link of this.resolveLatestLinks(allLinks)) {
      if (!link.isActive) continue;
      if (!isTaskToRsipEffect(link.effect)) continue;
      if (link.triggerEvent !== payload.event) continue;
      if (link.chainId !== payload.chainId) continue;
      if (link.chainKind !== payload.chainKind) continue;

      const dedupKey = buildEventDedupKey(link, payload.event, dateOnly);
      const deduped = this.processedEventKeys.has(dedupKey);
      if (!deduped) {
        this.processedEventKeys.add(dedupKey);
      }

      matches.push({ link, deduped });
    }

    return matches;
  }

  getRsipToTaskLinks(allLinks: RSIPTaskLink[], rsipNodeId: string): RSIPTaskLink[] {
    return this.resolveLatestLinks(allLinks).filter(
      (link) =>
        link.isActive &&
        link.rsipNodeId === rsipNodeId &&
        link.triggerEvent === 'rsip_mark_executed' &&
        isRsipToTaskEffect(link.effect),
    );
  }
}

export const rsipTaskIntegrationService = new RSIPTaskIntegrationService();
