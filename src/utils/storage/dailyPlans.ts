import type { DailyPlan } from '../../types';
import { decodeDailyPlan } from '../../serialization';
import { STORAGE_KEYS } from './keys';

export function getDailyPlans(): DailyPlan[] {
  const raw = localStorage.getItem(STORAGE_KEYS.DAILY_PLANS);
  if (!raw) return [];

  try {
    const plans: unknown = JSON.parse(raw);
    return Array.isArray(plans)
      ? plans
          .filter((plan): plan is Record<string, unknown> =>
            Boolean(
              plan &&
              typeof plan === 'object' &&
              typeof plan.id === 'string' &&
              typeof plan.planDate === 'string',
            ),
          )
          .map((plan) => decodeDailyPlan(plan as never))
      : [];
  } catch {
    return [];
  }
}

export function saveDailyPlans(plans: DailyPlan[]): void {
  localStorage.setItem(STORAGE_KEYS.DAILY_PLANS, JSON.stringify(plans));
}
