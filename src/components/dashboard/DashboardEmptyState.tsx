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
    className="animate-slide-up py-20 text-center"
  >
    <div className="bento-card mx-auto max-w-lg">
      <div className="gradient-primary mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl shadow-2xl">
        <Link className="text-white" size={32} />
      </div>
      <h2 className="mb-4 font-chinese text-3xl font-bold text-gray-900 dark:text-slate-100">
        {tr('创建你的第一条链', 'Create your first chain')}
      </h2>
      <p className="mb-8 leading-relaxed text-gray-700 dark:text-slate-300">
        {tr(
          '链代表你想要持续做的任务。每次成功完成，你的记录就会增长一点。',
          'A chain represents a task you want to keep doing. Every successful completion grows your streak.',
        )}
      </p>
      <div className="flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
        <button
          type="button"
          onClick={onCreateChain}
          aria-label={tr('创建第一条链', 'Create chain')}
          className="gradient-primary flex items-center space-x-3 rounded-2xl px-8 py-4 font-medium text-white shadow-xl transition duration-300 hover:scale-105 hover:shadow-2xl"
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
          className="flex items-center space-x-2 rounded-2xl bg-gray-100 px-6 py-4 font-medium text-gray-700 shadow-lg transition duration-300 hover:scale-105 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
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
            className="flex items-center space-x-2 rounded-2xl bg-emerald-50 px-6 py-4 font-medium text-emerald-700 shadow-lg transition duration-300 hover:scale-105 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
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
