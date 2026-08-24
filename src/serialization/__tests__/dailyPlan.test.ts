import { describe, expect, it } from 'vitest';
import { decodeDailyPlan } from '../dailyPlan';

describe('serialization/dailyPlan', () => {
  it('preserves a completed unit’s completion-history link', () => {
    const plan = decodeDailyPlan({
      id: 'plan-1',
      planDate: '2026-08-24',
      items: [
        {
          id: 'item-1',
          dailyPlanId: 'plan-1',
          chainId: 'chain-1',
          status: 'completed',
          completionHistoryId: 'history-1',
        },
      ],
    });

    expect(plan.items[0]?.completionHistoryId).toBe('history-1');
  });
});
