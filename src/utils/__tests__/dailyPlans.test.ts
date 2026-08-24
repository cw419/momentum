import { describe, expect, it } from 'vitest';
import {
  addPlanUnits,
  closeOverdueDailyPlans,
  createTodayPlan,
  getLocalPlanDate,
  removePendingPlanUnits,
  setPlanItemStarted,
  setPlanItemStatus,
} from '../dailyPlans';

describe('dailyPlans', () => {
  it('uses the local calendar date', () => {
    expect(getLocalPlanDate(new Date(2026, 7, 24, 23, 30))).toBe('2026-08-24');
  });

  it('represents each planned repetition as an independent plan unit', () => {
    const plan = addPlanUnits(createTodayPlan(new Date(2026, 7, 24)), 'A', 3);
    expect(plan.items).toHaveLength(3);
    expect(plan.items.every((item) => item.chainId === 'A')).toBe(true);
  });

  it('only removes unfinished plan units', () => {
    const plan = addPlanUnits(createTodayPlan(), 'A', 3);
    const completed = setPlanItemStatus(plan, plan.items[0]!.id, 'completed');
    const reduced = removePendingPlanUnits(completed, 'A', 2);
    expect(reduced.items).toHaveLength(1);
    expect(reduced.items[0]!.status).toBe('completed');
  });

  it('records the actual start and completion times for a plan unit', () => {
    const plan = addPlanUnits(createTodayPlan(), 'A', 1);
    const startedAt = new Date('2026-08-24T09:10:00.000Z');
    const completedAt = new Date('2026-08-24T09:43:00.000Z');
    const started = setPlanItemStarted(plan, plan.items[0]!.id, startedAt);
    const completed = setPlanItemStatus(
      started,
      plan.items[0]!.id,
      'completed',
      completedAt,
      'history-1',
    );

    expect(completed.items[0]).toMatchObject({
      startedAt,
      completedAt,
      completionHistoryId: 'history-1',
    });
  });

  it('closes overdue plans without removing completed units', () => {
    const plan = addPlanUnits(createTodayPlan(new Date(2026, 7, 23)), 'A', 2);
    const completed = setPlanItemStatus(plan, plan.items[0]!.id, 'completed');
    const [closed] = closeOverdueDailyPlans([completed], '2026-08-24');
    expect(closed?.closedAt).toBeDefined();
    expect(closed?.items.map((item) => item.status)).toEqual([
      'completed',
      'incomplete',
    ]);
  });
});
