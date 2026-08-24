/** A task chain's lifetime intent in the task library. */
export type TaskDirection = 'periodic' | 'goal';

/** A single, non-repeatable allocation of a chain in one calendar day. */
export type DailyPlanItemStatus = 'pending' | 'completed' | 'incomplete';

export interface DailyPlanItem {
  id: string;
  dailyPlanId: string;
  chainId: string;
  status: DailyPlanItemStatus;
  createdAt: Date;
  /** The most recent actual focus-session start for this planned unit. */
  startedAt?: Date;
  completedAt?: Date;
  /** The actual completion record produced when this unit was finished. */
  completionHistoryId?: string;
}

/** The unique task group for one local calendar date. */
export interface DailyPlan {
  id: string;
  /** ISO local calendar date (`YYYY-MM-DD`), never user-editable. */
  planDate: string;
  createdAt: Date;
  closedAt?: Date;
  items: DailyPlanItem[];
}
