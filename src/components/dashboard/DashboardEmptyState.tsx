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
  <div data-testid="dashboard-empty-state" className="text-center py-20 animate-slide-up">
    <div className="bento-card max-w-lg mx-auto">
      <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-8 shadow-2xl">
        <Link className="text-white" size={32} />
      </div>
      <h2 className="text-3xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-4">
        {tr('创建你的第一条链', 'Create your first chain')}
      </h2>
      <p className="text-gray-700 dark:text-slate-300 mb-8 leading-relaxed">
        {tr(
          '链代表你想要持续做的任务。每次成功完成，你的记录就会增长一点。',
          'A chain represents a task you want to keep doing. Every successful completion grows your streak.'
        )}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
        <button
          type="button"
          onClick={onCreateChain}
          aria-label={tr('创建第一条链', 'Create chain')}
          className="gradient-primary hover:shadow-2xl text-white px-8 py-4 rounded-2xl font-medium transition duration-300 flex items-center space-x-3 hover:scale-105 shadow-xl"
        >
          <Plus size={18} aria-hidden="true" />
          <span className="font-chinese font-semibold">{tr('创建第一条链', 'Create chain')}</span>
        </button>
        <button
          type="button"
          onClick={onShowImportExport}
          aria-label={tr('数据管理', 'Data')}
          className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-6 py-4 rounded-2xl font-medium transition duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg"
        >
          <Download size={16} aria-hidden="true" />
          <span className="font-chinese font-medium">{tr('数据管理', 'Data')}</span>
        </button>
        {onOpenRSIP && (
          <button
            type="button"
            onClick={onOpenRSIP}
            aria-label={tr('国策树', 'RSIP Tree')}
            className="bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-6 py-4 rounded-2xl font-medium transition duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg"
          >
            <TreePine size={16} aria-hidden="true" />
            <span className="font-chinese font-medium">{tr('国策树', 'RSIP Tree')}</span>
          </button>
        )}
      </div>
    </div>
  </div>
);

export const DashboardEmptyState = React.memo(DashboardEmptyStateComponent);

DashboardEmptyState.displayName = 'DashboardEmptyState';

