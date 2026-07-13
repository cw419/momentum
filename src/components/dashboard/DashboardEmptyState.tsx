import React from 'react';
import { Download, Link, Plus, TreePine } from 'lucide-react';

interface DashboardEmptyStateProps {
  onCreateChain: () => void;
  onShowImportExport: () => void;
  onOpenRSIP?: () => void;
  tr: (zh: string, en: string) => string;
}

const DashboardEmptyStateComponent: React.FC<DashboardEmptyStateProps> = ({
  onCreateChain,
  onShowImportExport,
  onOpenRSIP,
  tr,
}) => (
  <div
    data-testid="dashboard-empty-state"
    className="animate-slide-up py-12 sm:py-20"
  >
    <div className="mx-auto max-w-2xl border-l-2 border-primary-500 pl-6 sm:pl-8">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
        <Link size={24} />
      </div>
      <h2 className="mb-3 font-chinese text-3xl font-bold tracking-tight text-gray-950 dark:text-slate-100 sm:text-4xl">
        {tr('创建你的第一条链', 'Create your first chain')}
      </h2>
      <p className="mb-7 max-w-xl leading-7 text-gray-600 dark:text-slate-300">
        {tr(
          '链代表你想要持续做的任务。每次成功完成，你的记录就会增长一点。',
          'A chain represents a task you want to keep doing. Every successful completion grows your streak.',
        )}
      </p>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onCreateChain}
          aria-label={tr('创建第一条链', 'Create chain')}
          className="focus-ring flex min-h-12 items-center justify-center gap-3 rounded-xl bg-gray-950 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-primary-200"
        >
          <Plus size={18} aria-hidden="true" />
          <span className="font-chinese font-semibold">
            {tr('创建第一条链', 'Create chain')}
          </span>
        </button>
        <button
          type="button"
          onClick={onShowImportExport}
          aria-label={tr('数据管理', 'Data')}
          className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Download size={16} aria-hidden="true" />
          <span className="font-chinese font-medium">
            {tr('数据管理', 'Data')}
          </span>
        </button>
        {onOpenRSIP && (
          <button
            type="button"
            onClick={onOpenRSIP}
            aria-label={tr('国策树', 'RSIP Tree')}
            className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300"
          >
            <TreePine size={16} aria-hidden="true" />
            <span className="font-chinese font-medium">
              {tr('国策树', 'RSIP Tree')}
            </span>
          </button>
        )}
      </div>
    </div>
  </div>
);

export const DashboardEmptyState = React.memo(DashboardEmptyStateComponent);

DashboardEmptyState.displayName = 'DashboardEmptyState';
