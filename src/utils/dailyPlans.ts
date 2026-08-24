import type { DailyPlan, DailyPlanItem, DailyPlanItemStatus } from '../types';

export function getLocalPlanDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function closeOverdueDailyPlans(
  plans: DailyPlan[],
  today: string = getLocalPlanDate(),
  closedAt: Date = new Date(),
): DailyPlan[] {
  return plans.map((plan) => {
    if (plan.closedAt || plan.planDate >= today) return plan;
    return {
      ...plan,
      closedAt,
      items: plan.items.map((item) =>
        item.status === 'pending' ? { ...item, status: 'incomplete' } : item,
      ),
    };
  });
}

export function getTodayPlan(
  plans: DailyPlan[],
  today: string = getLocalPlanDate(),
): DailyPlan | undefined {
  return plans.find((plan) => plan.planDate === today && !plan.closedAt);
}

export function createTodayPlan(now: Date = new Date()): DailyPlan {
  return {
    id: crypto.randomUUID(),
    planDate: getLocalPlanDate(now),
    createdAt: now,
    items: [],
  };
}

export function addPlanUnits(
  plan: DailyPlan,
  chainId: string,
  count: number,
  now: Date = new Date(),
): DailyPlan {
  const units = Array.from({ length: Math.max(0, Math.floor(count)) }, () => ({
    id: crypto.randomUUID(),
    dailyPlanId: plan.id,
    chainId,
    status: 'pending' as const,
    createdAt: now,
  }));
  return { ...plan, items: [...plan.items, ...units] };
}

export function removePendingPlanUnits(
  plan: DailyPlan,
  chainId: string,
  count: number,
): DailyPlan {
  let remaining = Math.max(0, Math.floor(count));
  const retained = [...plan.items]
    .reverse()
    .filter((item) => {
      if (
        remaining > 0 &&
        item.chainId === chainId &&
        item.status === 'pending'
      ) {
        remaining -= 1;
        return false;
      }
      return true;
    })
    .reverse();
  return { ...plan, items: retained };
}

export function setPlanItemStatus(
  plan: DailyPlan,
  itemId: string,
  status: DailyPlanItemStatus,
  now: Date = new Date(),
  completionHistoryId?: string,
): DailyPlan {
  return {
    ...plan,
    items: plan.items.map(
      (item): DailyPlanItem =>
        item.id === itemId
          ? {
              ...item,
              status,
              completedAt: status === 'completed' ? now : undefined,
              completionHistoryId:
                status === 'completed'
                  ? (completionHistoryId ?? item.completionHistoryId)
                  : undefined,
            }
          : item,
    ),
  };
}

export function setPlanItemStarted(
  plan: DailyPlan,
  itemId: string,
  startedAt: Date = new Date(),
): DailyPlan {
  return {
    ...plan,
    items: plan.items.map((item) =>
      item.id === itemId ? { ...item, startedAt } : item,
    ),
  };
}
