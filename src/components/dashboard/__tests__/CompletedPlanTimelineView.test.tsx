import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chain, CompletionHistory } from '../../../types';
import { CompletedPlanTimeline } from '../CompletedPlanTimeline';

vi.mock('@fullcalendar/react', () => ({
  default: ({
    initialDate,
    events,
  }: {
    initialDate: string;
    events: unknown[];
  }) => (
    <div
      data-testid="calendar"
      data-date={initialDate}
      data-event-count={events.length}
    />
  ),
}));

const tr = (zh: string, _en: string) => zh;

const history: CompletionHistory[] = [
  {
    id: 'history-1',
    chainId: 'chain-1',
    startedAt: new Date('2026-08-25T09:00:00'),
    completedAt: new Date('2026-08-25T09:30:00'),
    duration: 30,
    wasSuccessful: true,
    description: '完成初稿',
    notes: '明天校对',
  },
];

describe('CompletedPlanTimeline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lets users jump to any date and keeps future dates read-only and empty', () => {
    render(
      <CompletedPlanTimeline
        history={history}
        completedPlanItems={[]}
        chainById={new Map([['chain-1', { name: '论文代码' } as Chain]])}
        tr={tr}
      />,
    );

    expect(screen.getByTestId('calendar')).toHaveAttribute(
      'data-event-count',
      '1',
    );

    fireEvent.change(screen.getByLabelText('选择完成记录日期'), {
      target: { value: '2026-09-01' },
    });

    expect(screen.getByTestId('calendar')).toHaveAttribute(
      'data-date',
      '2026-09-01',
    );
    expect(screen.getByTestId('calendar')).toHaveAttribute(
      'data-event-count',
      '0',
    );
    expect(screen.getByText('这一天还没有完成记录。')).toBeInTheDocument();
  });
});
