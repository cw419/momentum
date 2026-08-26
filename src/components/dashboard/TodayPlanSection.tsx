import { Minus, Play, Plus, Sun } from 'lucide-react';
import type { Chain, CompletionHistory, DailyPlan } from '../../types';
import { CompletedPlanTimeline } from './CompletedPlanTimeline';

interface Props {
  plans: DailyPlan[];
  chains: Chain[];
  history?: CompletionHistory[];
  onAddUnits: (chainId: string, count: number) => Promise<void>;
  onRemoveUnits: (chainId: string, count: number) => Promise<void>;
  onCreateChainForToday: () => void;
  onStartItem: (chainId: string, itemId: string) => Promise<void>;
  tr: (zh: string, en: string) => string;
}

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function TodayPlanSection({
  plans = [],
  chains,
  history = [],
  onAddUnits,
  onRemoveUnits,
  onCreateChainForToday,
  onStartItem,
  tr,
}: Props) {
  const plan = plans.find(
    (candidate) => candidate.planDate === localDate() && !candidate.closedAt,
  );
  const chainById = new Map(chains.map((chain) => [chain.id, chain]));
  const pending = new Map<string, string[]>();
  const completedPlanItems = (plan?.items ?? []).filter(
    (item) => item.status === 'completed',
  );
  const hasCompletedHistoryToday = history.some((item) => {
    const completedAt = item.completedAt;
    const now = new Date();
    return (
      item.wasSuccessful &&
      completedAt.getFullYear() === now.getFullYear() &&
      completedAt.getMonth() === now.getMonth() &&
      completedAt.getDate() === now.getDate()
    );
  });
  for (const item of plan?.items ?? []) {
    if (item.status === 'pending') {
      pending.set(item.chainId, [
        ...(pending.get(item.chainId) ?? []),
        item.id,
      ]);
    }
  }
  const available = chains.filter(
    (chain) =>
      chain.type !== 'group' &&
      !chain.goalCompletedAt &&
      chain.deletedAt == null,
  );

  return (
    <section className="mb-8 rounded-3xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="mb-4 flex items-center gap-3">
        <Sun className="text-amber-600" size={22} />
        <div>
          <h2 className="font-chinese text-xl font-bold text-gray-950 dark:text-slate-100">
            {tr('今日计划', 'Today')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {tr(
              '自由选择任一未完成单元开启专注',
              'Start any unfinished unit in any order',
            )}
          </p>
        </div>
      </div>

      {pending.size === 0 ? (
        <p className="mb-4 text-sm text-gray-600 dark:text-slate-300">
          {tr('还没有未完成的计划单元。', 'No unfinished units yet.')}
        </p>
      ) : (
        <div className="mb-5 grid gap-2 sm:grid-cols-2">
          {[...pending.entries()].map(([chainId, itemIds]) => {
            const chain = chainById.get(chainId);
            if (!chain) return null;
            return (
              <div
                key={chainId}
                className="flex items-center gap-2 rounded-2xl bg-white p-3 dark:bg-slate-800"
              >
                <button
                  type="button"
                  onClick={() => onStartItem(chainId, itemIds[0]!)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left font-chinese font-semibold text-gray-900 dark:text-slate-100"
                >
                  <Play size={16} className="shrink-0 text-primary-600" />
                  <span className="truncate">
                    {chain.name} × {itemIds.length}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={tr('增加一个单元', 'Add one unit')}
                  onClick={() => onAddUnits(chainId, 1)}
                  className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  aria-label={tr(
                    '减少一个未完成单元',
                    'Remove one unfinished unit',
                  )}
                  onClick={() => onRemoveUnits(chainId, 1)}
                  className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                >
                  <Minus size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-amber-200 pt-4 dark:border-amber-900/50">
        <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
          {tr('添加任务', 'Add task')}
        </p>
        <div className="flex flex-wrap gap-2">
          {available.map((chain) => (
            <button
              key={chain.id}
              type="button"
              onClick={() => onAddUnits(chain.id, 1)}
              className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-gray-800 hover:border-amber-500 dark:bg-slate-800 dark:text-slate-100"
            >
              <Plus className="mr-1 inline" size={14} />
              {chain.name}
            </button>
          ))}
          <button
            type="button"
            onClick={onCreateChainForToday}
            className="rounded-xl border border-dashed border-amber-400 bg-white px-3 py-2 text-sm font-medium text-amber-800 hover:border-amber-600 dark:bg-slate-800 dark:text-amber-200"
          >
            <Plus className="mr-1 inline" size={14} />
            {tr('创建新任务链', 'Create new chain')}
          </button>
        </div>
      </div>

      {(hasCompletedHistoryToday || completedPlanItems.length > 0) && (
        <div className="mt-4 border-t border-amber-200 pt-4 dark:border-amber-900/50">
          <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
            {tr('已完成', 'Completed')}
          </p>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">
              {tr('时间表', 'Timeline')}
            </p>
            <CompletedPlanTimeline
              history={history}
              completedPlanItems={completedPlanItems}
              chainById={chainById}
              tr={tr}
            />
          </div>
        </div>
      )}
    </section>
  );
}
