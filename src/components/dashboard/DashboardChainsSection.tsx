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
    <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h2 className="mb-2 font-chinese text-3xl font-bold text-gray-900 dark:text-slate-100">
          {tr('你的任务链', 'Your Task Chains')}
        </h2>
        <p className="font-mono text-sm tracking-wide text-gray-600 dark:text-slate-400">
          {tr('任务链列表', 'YOUR TASK CHAINS')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onShowRecycleBin}
          aria-label={tr('回收箱', 'Recycle bin')}
          className="relative flex shrink-0 items-center space-x-2 rounded-2xl bg-gray-100 px-4 py-3 font-medium text-gray-700 shadow-lg transition duration-300 hover:scale-105 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
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
          className="flex shrink-0 items-center space-x-2 rounded-2xl bg-gray-100 px-4 py-3 font-medium text-gray-700 shadow-lg transition duration-300 hover:scale-105 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
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
          className="flex shrink-0 items-center space-x-2 rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-700 shadow-lg transition duration-300 hover:scale-105 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
        >
          <TreePine size={16} aria-hidden="true" />
          <span className="font-chinese font-medium">
            {tr('国策树', 'RSIP Tree')}
          </span>
        </button>
        <button
          type="button"
          onClick={onCreateChain}
          aria-label={tr('新建链', 'New Chain')}
          className="gradient-dark flex shrink-0 items-center space-x-2 rounded-2xl px-6 py-3 font-medium text-white shadow-lg transition duration-300 hover:scale-105 hover:shadow-xl"
        >
          <Plus size={16} aria-hidden="true" />
          <span className="font-chinese font-medium">
            {tr('新建链', 'New Chain')}
          </span>
        </button>
        {onCreateTaskGroup && (
          <button
            type="button"
            onClick={onCreateTaskGroup}
            aria-label={tr('新建任务群', 'New Group')}
            className="flex shrink-0 items-center space-x-2 rounded-2xl bg-green-500 px-6 py-3 font-medium text-white shadow-lg transition duration-300 hover:scale-105 hover:bg-green-600 hover:shadow-xl"
          >
            <Layers size={16} aria-hidden="true" />
            <span className="font-chinese font-medium">
              {tr('新建任务群', 'New Group')}
            </span>
          </button>
        )}
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
