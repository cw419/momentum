import { describe, expect, it } from 'vitest';
import {
  RSIPTaskIntegrationService,
  type RSIPTaskEventPayload,
} from '../RSIPTaskIntegrationService';
import type { RSIPTaskLink } from '../../../types';

function createLink(overrides: Partial<RSIPTaskLink> = {}): RSIPTaskLink {
  return {
    id: overrides.id ?? 'link-1',
    rsipNodeId: overrides.rsipNodeId ?? 'rsip-node-1',
    chainId: overrides.chainId ?? 'chain-1',
    chainKind: overrides.chainKind ?? 'unit',
    triggerEvent: overrides.triggerEvent ?? 'task_completed',
    effect: overrides.effect ?? 'mark_rsip_executed',
    automation: overrides.automation ?? 'confirm',
    isActive: overrides.isActive ?? true,
    updatedAt: overrides.updatedAt ?? new Date('2026-02-08T00:00:00.000Z'),
    userId: overrides.userId ?? 'user-1',
  };
}

describe('RSIPTaskIntegrationService', () => {
  it('applies last-write-wins when links conflict on unique key', () => {
    const service = new RSIPTaskIntegrationService();
    const oldLink = createLink({
      id: 'old',
      updatedAt: new Date('2026-02-08T00:00:00.000Z'),
    });
    const newLink = createLink({
      id: 'new',
      updatedAt: new Date('2026-02-08T00:01:00.000Z'),
    });

    const result = service.resolveLatestLinks([oldLink, newLink]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('new');
  });

  it('deduplicates same link + same event + same day', () => {
    const service = new RSIPTaskIntegrationService();
    const link = createLink({ id: 'dedupe-link' });
    const payload: RSIPTaskEventPayload = {
      event: 'task_completed',
      chainId: 'chain-1',
      chainKind: 'unit',
      occurredAt: new Date('2026-02-08T12:00:00.000Z'),
    };

    const first = service.matchTaskEventLinks([link], payload);
    const second = service.matchTaskEventLinks([link], payload);

    expect(first).toHaveLength(1);
    expect(first[0].deduped).toBe(false);
    expect(second).toHaveLength(1);
    expect(second[0].deduped).toBe(true);
  });

  it('returns rsip->task action links only for rsip_mark_executed', () => {
    const service = new RSIPTaskIntegrationService();
    const links = [
      createLink({
        id: 'action-1',
        triggerEvent: 'rsip_mark_executed',
        effect: 'prompt_start_chain',
      }),
      createLink({
        id: 'action-2',
        triggerEvent: 'task_completed',
        effect: 'mark_rsip_executed',
      }),
    ];

    const result = service.getRsipToTaskLinks(links, 'rsip-node-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('action-1');
  });
});
