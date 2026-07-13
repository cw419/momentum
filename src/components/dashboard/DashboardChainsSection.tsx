import React from 'react';
import { Download, Layers, Plus, Trash2, TreePine } from 'lucide-react';

import type { ChainTreeNode, ScheduledSession } from '../../types';
import { VirtualizedChainList } from '../VirtualizedChainList';

interface DashboardChainsSectionProps {
  topLevelChains: ChainTreeNode[];
  recycleBinCount: number;
  getScheduledSession: (chainId: string) => ScheduledSession | undefined;
  onStartChain: (chainId: string) => void;
  onScheduleChain: (chainId: string) => void;
  onViewChainDetail: (chainId: string) => void;
  onCancelScheduledSession?: (chainId: string) => void;
  onCompleteBooking?: (chainId: string) => void;
  onDeleteChain: (chainId: string) => void;
  onShowRecycleBin: () => void;
  onShowImportExport: () => void;
  onOpenRSIP?: () => void;
  onCreateChain: () => void;
  onCreateTaskGroup?: () => void;
  tr: (zh: string, en: string) => string;
}

const DashboardChainsSectionComponent: React.FC<
  DashboardChainsSectionProps
> = ({
  topLevelChains,
  recycleBinCount,
  getScheduledSession,
  onStartChain,
  onScheduleChain,
  onViewChainDetail,
  onCancelScheduledSession,
  onCompleteBooking,
  onDeleteChain,
  onShowRecycleBin,
  onShowImportExport,
  onOpenRSIP,
  onCreateChain,
  onCreateTaskGroup,
  tr,
}) => (
  <div className="animate-slide-up">
    <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h2 className="mb-1 font-chinese text-2xl font-bold tracking-tight text-gray-950 dark:text-slate-100 sm:text-3xl">
          {tr('你的任务链', 'Your Task Chains')}
        </h2>
        <p className="font-chinese text-sm text-gray-500 dark:text-slate-400">
          {tr(
            '选择当前要推进的任务',
            'Choose what you want to move forward now',
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCreateChain}
          aria-label={tr('新建链', 'New Chain')}
          className="focus-ring flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-gray-950 px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-primary-200"
        >
          <Plus size={16} aria-hidden="true" />
          <span className="font-chinese font-semibold">
            {tr('新建链', 'New Chain')}
          </span>
        </button>
        {onCreateTaskGroup && (
          <button
            type="button"
            onClick={onCreateTaskGroup}
            aria-label={tr('新建任务群', 'New Group')}
            className="focus-ring flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-800 transition-colors hover:border-primary-300 hover:text-primary-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-primary-500"
          >
            <Layers size={16} aria-hidden="true" />
            <span className="font-chinese font-medium">
              {tr('新建任务群', 'New Group')}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={onShowRecycleBin}
          aria-label={tr('回收箱', 'Recycle bin')}
          className="focus-ring relative flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Trash2 size={16} aria-hidden="true" />
          <span className="font-chinese font-medium">
            {tr('回收箱', 'Recycle bin')}
          </span>
          {recycleBinCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {recycleBinCount > 99 ? '99+' : recycleBinCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onShowImportExport}
          aria-label={tr('数据管理', 'Data')}
          className="focus-ring flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Download size={16} aria-hidden="true" />
          <span className="font-chinese font-medium">
            {tr('数据管理', 'Data')}
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenRSIP}
          aria-label={tr('国策树', 'RSIP Tree')}
          className="focus-ring flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300"
        >
          <TreePine size={16} aria-hidden="true" />
          <span className="font-chinese font-medium">
            {tr('国策树', 'RSIP Tree')}
          </span>
        </button>
      </div>
    </div>

    <VirtualizedChainList
      topLevelChains={topLevelChains}
      getScheduledSession={getScheduledSession}
      onStartChain={onStartChain}
      onScheduleChain={onScheduleChain}
      onViewDetail={onViewChainDetail}
      onCancelScheduledSession={onCancelScheduledSession}
      onCompleteBooking={onCompleteBooking}
      onDelete={onDeleteChain}
    />
  </div>
);

export const DashboardChainsSection = React.memo(
  DashboardChainsSectionComponent,
);

DashboardChainsSection.displayName = 'DashboardChainsSection';
