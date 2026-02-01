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

const DashboardChainsSectionComponent: React.FC<DashboardChainsSectionProps> = ({
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
    <div className="flex flex-col gap-6 lg:flex-row lg:justify-between lg:items-center mb-12">
      <div className="min-w-0">
        <h2 className="text-3xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-2">
          {tr('你的任务链', 'Your Task Chains')}
        </h2>
        <p className="text-gray-600 dark:text-slate-400 font-mono text-sm tracking-wide">
          {tr('任务链列表', 'YOUR TASK CHAINS')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onShowRecycleBin}
          aria-label={tr('回收箱', 'Recycle bin')}
          className="relative shrink-0 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-4 py-3 rounded-2xl font-medium transition duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg"
        >
          <Trash2 size={16} aria-hidden="true" />
          <span className="font-chinese font-medium">{tr('回收箱', 'Recycle bin')}</span>
          {recycleBinCount > 0 && (
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {recycleBinCount > 99 ? '99+' : recycleBinCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onShowImportExport}
          aria-label={tr('数据管理', 'Data')}
          className="shrink-0 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-4 py-3 rounded-2xl font-medium transition duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg"
        >
          <Download size={16} aria-hidden="true" />
          <span className="font-chinese font-medium">{tr('数据管理', 'Data')}</span>
        </button>
        <button
          type="button"
          onClick={onOpenRSIP}
          aria-label={tr('国策树', 'RSIP Tree')}
          className="shrink-0 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-2xl font-medium transition duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg"
        >
          <TreePine size={16} aria-hidden="true" />
          <span className="font-chinese font-medium">{tr('国策树', 'RSIP Tree')}</span>
        </button>
        <button
          type="button"
          onClick={onCreateChain}
          aria-label={tr('新建链', 'New Chain')}
          className="shrink-0 gradient-dark hover:shadow-xl text-white px-6 py-3 rounded-2xl font-medium transition duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg"
        >
          <Plus size={16} aria-hidden="true" />
          <span className="font-chinese font-medium">{tr('新建链', 'New Chain')}</span>
        </button>
        {onCreateTaskGroup && (
          <button
            type="button"
            onClick={onCreateTaskGroup}
            aria-label={tr('新建任务群', 'New Group')}
            className="shrink-0 bg-green-500 hover:bg-green-600 hover:shadow-xl text-white px-6 py-3 rounded-2xl font-medium transition duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg"
          >
            <Layers size={16} aria-hidden="true" />
            <span className="font-chinese font-medium">{tr('新建任务群', 'New Group')}</span>
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

export const DashboardChainsSection = React.memo(DashboardChainsSectionComponent);

DashboardChainsSection.displayName = 'DashboardChainsSection';

