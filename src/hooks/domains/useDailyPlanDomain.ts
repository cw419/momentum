import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import {
  addPlanUnits,
  closeOverdueDailyPlans,
  createTodayPlan,
  getTodayPlan,
  removePendingPlanUnits,
} from '../../utils/dailyPlans';
import { resolveAppStateReader } from './appStateAccess';
import { logger } from '../../utils/logger';
import { toast } from '../../utils/toast';
import { normalizeUnknownError } from '../../utils/errors/normalizeError';

interface Params {
  state?: AppState;
  getState?: () => AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  startChain: (chainId: string, dailyPlanItemId?: string) => Promise<void>;
}

export function useDailyPlanDomain({
  state,
  getState,
  setState,
  storage,
  startChain,
}: Params) {
  const readState = resolveAppStateReader({ state, getState });

  async function persist(plans: AppState['dailyPlans']) {
    setState((previous) => ({ ...previous, dailyPlans: plans }));
    try {
      await storage.saveDailyPlans(plans);
    } catch (error) {
      logger.error(
        'DAILY_PLAN',
        '保存今日计划失败',
        undefined,
        normalizeUnknownError(error),
      );
      toast.error(
        '今日计划已暂时保留在本页，但未能同步。请确认已应用 daily_plans 数据库迁移后重试。',
      );
    }
  }

  function planForToday() {
    const current = readState();
    const closed = closeOverdueDailyPlans(current.dailyPlans);
    const existing = getTodayPlan(closed);
    return { plans: closed, plan: existing ?? createTodayPlan() };
  }

  async function addUnits(chainId: string, count: number) {
    const { plans, plan } = planForToday();
    const nextPlan = addPlanUnits(plan, chainId, count);
    const withoutCurrent = plans.filter(
      (candidate) => candidate.id !== plan.id,
    );
    await persist([...withoutCurrent, nextPlan]);
  }

  async function removeUnits(chainId: string, count: number) {
    const { plans, plan } = planForToday();
    if (!getTodayPlan(plans)) return;
    const nextPlan = removePendingPlanUnits(plan, chainId, count);
    await persist(
      plans.map((candidate) =>
        candidate.id === plan.id ? nextPlan : candidate,
      ),
    );
  }

  async function startPlanItem(chainId: string, itemId: string) {
    await startChain(chainId, itemId);
  }

  return { addUnits, removeUnits, startPlanItem };
}
