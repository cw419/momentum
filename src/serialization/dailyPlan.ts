import type { DailyPlan, DailyPlanItem, DailyPlanItemStatus } from '../types';
import { parseDateOrUndefined, parseTruthyDateOrNow } from './primitives';

const STATUSES: ReadonlySet<DailyPlanItemStatus> = new Set([
  'pending',
  'completed',
  'incomplete',
]);

type SerializedDailyPlanItem = Partial<DailyPlanItem> & {
  id: string;
  dailyPlanId: string;
  chainId: string;
  createdAt?: string | Date | null;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  completionHistoryId?: string | null;
};

type SerializedDailyPlan = Partial<DailyPlan> & {
  id: string;
  planDate: string;
  createdAt?: string | Date | null;
  closedAt?: string | Date | null;
  items?: SerializedDailyPlanItem[];
};

function decodeItem(
  raw: SerializedDailyPlanItem,
  dailyPlanId: string,
): DailyPlanItem {
  return {
    id: raw.id,
    dailyPlanId,
    chainId: raw.chainId,
    status: STATUSES.has(raw.status as DailyPlanItemStatus)
      ? (raw.status as DailyPlanItemStatus)
      : 'pending',
    createdAt: parseTruthyDateOrNow(raw.createdAt),
    startedAt: parseDateOrUndefined(raw.startedAt),
    completedAt: parseDateOrUndefined(raw.completedAt),
    completionHistoryId:
      typeof raw.completionHistoryId === 'string'
        ? raw.completionHistoryId
        : undefined,
  };
}

export function decodeDailyPlan(raw: SerializedDailyPlan): DailyPlan {
  return {
    id: raw.id,
    planDate: raw.planDate,
    createdAt: parseTruthyDateOrNow(raw.createdAt),
    closedAt: parseDateOrUndefined(raw.closedAt),
    items: Array.isArray(raw.items)
      ? raw.items
          .filter(
            (item) =>
              item &&
              typeof item.id === 'string' &&
              typeof item.chainId === 'string',
          )
          .map((item) => decodeItem(item, raw.id))
      : [],
  };
}
