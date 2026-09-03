import { describe, expect, it } from 'vitest';
import type { Chain, CompletionHistory, DailyPlanItem } from '../../../types';
import { completedHistoryToEvents } from '../../../utils/completedPlanTimeline';

const tr = (zh: string, _en: string) => zh;

function makeHistory(
  overrides: Partial<CompletionHistory> = {},
): CompletionHistory {
  return {
    id: 'history-1',
    chainId: 'chain-1',
    startedAt: new Date('2026-08-25T09:10:00'),
    completedAt: new Date('2026-08-25T09:45:00'),
    duration: 35,
    wasSuccessful: true,
    ...overrides,
  };
}

function makePlanItem(overrides: Partial<DailyPlanItem> = {}): DailyPlanItem {
  return {
    id: 'plan-item-1',
    dailyPlanId: 'plan-1',
    chainId: 'chain-1',
    status: 'completed',
    createdAt: new Date('2026-08-25T09:10:00'),
    startedAt: new Date('2026-08-25T09:10:00'),
    completedAt: new Date('2026-08-25T09:45:00'),
    ...overrides,
  };
}

describe('completedHistoryToEvents', () => {
  it('maps successful completions with actual timestamps to timed events', () => {
    const start = new Date('2026-08-25T09:10:00');
    const end = new Date('2026-08-25T09:45:00');
    const chain = { name: '论文代码' } as Chain;

    const events = completedHistoryToEvents(
      [makeHistory({ startedAt: start, completedAt: end })],
      [],
      new Map([['chain-1', chain]]),
      tr,
      '2026-08-25',
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: 'history-1',
      title: '✓ [周期项] 论文代码',
      start,
      end,
      extendedProps: {
        durationMinutes: 35,
        description: undefined,
        notes: undefined,
        taskDirection: 'periodic',
        completionStatus: 'completed',
      },
    });
  });

  it('does not invent events for missing starts, failures, or another day', () => {
    const history = [
      makeHistory({ id: 'missing-start', startedAt: undefined }),
      makeHistory({
        id: 'failed',
        wasSuccessful: false,
        startedAt: new Date(),
        completedAt: new Date(),
      }),
      makeHistory({
        id: 'yesterday',
        startedAt: new Date('2026-08-24T09:10:00'),
        completedAt: new Date('2026-08-24T09:45:00'),
      }),
    ];

    expect(
      completedHistoryToEvents(history, [], new Map(), tr, '2026-08-25'),
    ).toEqual([]);
  });

  it('normalizes an accidentally zero-length interval to one minute', () => {
    const timestamp = new Date('2026-08-25T09:10:00');
    const chain = { name: '论文代码' } as Chain;
    const [event] = completedHistoryToEvents(
      [makeHistory({ startedAt: timestamp, completedAt: timestamp })],
      [],
      new Map([['chain-1', chain]]),
      tr,
      '2026-08-25',
    );

    expect(event?.extendedProps).toMatchObject({ durationMinutes: 1 });
    expect(event?.end).toEqual(new Date('2026-08-25T09:11:00'));
  });

  it('keeps completion descriptions and notes for calendar display', () => {
    const chain = { name: '论文代码' } as Chain;
    const [event] = completedHistoryToEvents(
      [makeHistory({ description: '完成初稿', notes: '明天校对' })],
      [],
      new Map([['chain-1', chain]]),
      tr,
      '2026-08-25',
    );

    expect(event?.extendedProps).toMatchObject({
      description: '完成初稿',
      notes: '明天校对',
    });
  });

  it('keeps pre-migration planned completions without duplicating new history', () => {
    const history = [
      makeHistory({ id: 'new-history' }),
      makeHistory({ id: 'old-history', startedAt: undefined }),
    ];
    const planItems = [
      makePlanItem({
        id: 'new-plan-item',
        completionHistoryId: 'new-history',
      }),
      makePlanItem({
        id: 'old-plan-item',
        completionHistoryId: 'old-history',
        startedAt: new Date('2026-08-25T10:00:00'),
        completedAt: new Date('2026-08-25T10:20:00'),
      }),
    ];

    const chain = { name: '论文代码' } as Chain;
    const events = completedHistoryToEvents(
      history,
      planItems,
      new Map([['chain-1', chain]]),
      tr,
      '2026-08-25',
    );

    expect(events).toHaveLength(2);
    expect(events.map((event) => event.id)).toEqual([
      'new-history',
      'plan-old-plan-item',
    ]);
  });

  it('keeps archived goal tasks in the timeline and labels them completed', () => {
    const chain = {
      name: '完成论文',
      taskDirection: 'goal',
      goalCompletedAt: new Date('2026-08-25T09:45:00'),
    } as Chain;

    const [event] = completedHistoryToEvents(
      [makeHistory()],
      [],
      new Map([['chain-1', chain]]),
      tr,
      '2026-08-25',
    );

    expect(event).toMatchObject({
      title: '✓ [目标项] 完成论文',
      extendedProps: {
        taskDirection: 'goal',
        completionStatus: 'completed',
      },
    });
  });

  it('does not show records for deleted or missing tasks', () => {
    const deletedChain = {
      name: '已删除任务',
      deletedAt: new Date('2026-08-25T10:00:00'),
    } as Chain;

    expect(
      completedHistoryToEvents(
        [makeHistory()],
        [],
        new Map([['chain-1', deletedChain]]),
        tr,
        '2026-08-25',
      ),
    ).toEqual([]);
    expect(
      completedHistoryToEvents(
        [makeHistory()],
        [],
        new Map(),
        tr,
        '2026-08-25',
      ),
    ).toEqual([]);
  });
});
