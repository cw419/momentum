import type { EventInput } from '@fullcalendar/core';
import type { Chain, CompletionHistory, DailyPlanItem } from '../types';

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface TimelineRecord {
  id: string;
  chainId: string;
  startedAt: Date;
  completedAt: Date;
  description?: string;
  notes?: string;
}

function toTimelineEvent(
  record: TimelineRecord,
  chainById: Map<string, Chain>,
  tr: (zh: string, en: string) => string,
): EventInput {
  const start = record.startedAt;
  const completed = record.completedAt;
  // FullCalendar requires a positive interval. Normal sessions are longer.
  const end =
    completed.getTime() > start.getTime()
      ? completed
      : new Date(start.getTime() + 60 * 1000);

  return {
    id: record.id,
    title:
      chainById.get(record.chainId)?.name ?? tr('已删除任务', 'Deleted task'),
    start,
    end,
    backgroundColor: '#059669',
    borderColor: '#047857',
    extendedProps: {
      durationMinutes: Math.max(
        1,
        Math.round((end.getTime() - start.getTime()) / 60000),
      ),
      description: record.description,
      notes: record.notes,
    },
  } satisfies EventInput;
}

/**
 * Builds today's timeline from all successful completion history. Completed
 * daily-plan units remain a fallback for pre-migration records that still have
 * timestamps on the plan item but not on their completion-history entry.
 */
export function completedHistoryToEvents(
  history: CompletionHistory[],
  completedPlanItems: DailyPlanItem[],
  chainById: Map<string, Chain>,
  tr: (zh: string, en: string) => string,
  today: string = localDate(new Date()),
): EventInput[] {
  const timedHistory = history
    .filter(
      (item) =>
        item.wasSuccessful &&
        item.startedAt &&
        localDate(item.completedAt) === today,
    )
    .map((item) => ({
      id: item.id ?? `${item.chainId}-${item.completedAt.getTime()}`,
      chainId: item.chainId,
      startedAt: item.startedAt!,
      completedAt: item.completedAt,
      description: item.description,
      notes: item.notes,
    }));
  const timedHistoryIds = new Set(timedHistory.map((item) => item.id));
  const legacyPlannedRecords = completedPlanItems
    .filter(
      (item) =>
        item.status === 'completed' &&
        item.startedAt &&
        item.completedAt &&
        localDate(item.completedAt) === today &&
        (!item.completionHistoryId ||
          !timedHistoryIds.has(item.completionHistoryId)),
    )
    .map((item) => ({
      id: `plan-${item.id}`,
      chainId: item.chainId,
      startedAt: item.startedAt!,
      completedAt: item.completedAt!,
    }));

  return [...timedHistory, ...legacyPlannedRecords].map((item) =>
    toTimelineEvent(item, chainById, tr),
  );
}
