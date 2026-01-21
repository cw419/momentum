/**
 * RecycleBinModalView - 纯展示组件
 */

import React from 'react';
import type { DeletedChain } from '../types';
import { DeletedChainCard } from './DeletedChainCard';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Trash2, RotateCcw, X, CheckSquare, Square } from 'lucide-react';
import type { ConfirmDialogState } from './useRecycleBinModal';

export interface RecycleBinModalViewProps {
  isOpen: boolean;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;

  // 状态
  deletedChains: DeletedChain[];
  selectedChains: Set<string>;
  isLoading: boolean;
  showConfirmDialog: ConfirmDialogState | null;

  // 工具函数
  formatDeletedTime: (deletedAt: Date) => string;

  // 事件处理器
  onClose: () => void;
  onSelectChain: (chainId: string, selected: boolean) => void;
  onSelectAll: () => void;
  onSingleRestore: (chainId: string) => void;
  onSinglePermanentDelete: (chainId: string) => void;
  onBulkRestore: () => void;
  onBulkPermanentDelete: () => void;
  onConfirmAction: () => void;
  onCancelConfirm: () => void;
}

const RecycleBinModalViewComponent: React.FC<RecycleBinModalViewProps> = ({
  isOpen,
  language,
  tr,
  deletedChains,
  selectedChains,
  isLoading,
  showConfirmDialog,
  formatDeletedTime,
  onClose,
  onSelectChain,
  onSelectAll,
  onSingleRestore,
  onSinglePermanentDelete,
  onBulkRestore,
  onBulkPermanentDelete,
  onConfirmAction,
  onCancelConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recycle-bin-modal-title"
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col"
      >
        {/* Header */}
        <Header
          deletedChainsCount={deletedChains.length}
          language={language}
          tr={tr}
          onClose={onClose}
        />

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <LoadingState tr={tr} />
          ) : deletedChains.length === 0 ? (
            <EmptyState tr={tr} />
          ) : (
            <>
              {/* Bulk Actions Bar */}
              <BulkActionsBar
                deletedChainsCount={deletedChains.length}
                selectedChainsCount={selectedChains.size}
                language={language}
                tr={tr}
                onSelectAll={onSelectAll}
                onBulkRestore={onBulkRestore}
                onBulkPermanentDelete={onBulkPermanentDelete}
              />

              {/* Chains List */}
              <ChainsList
                deletedChains={deletedChains}
                selectedChains={selectedChains}
                formatDeletedTime={formatDeletedTime}
                onSelectChain={onSelectChain}
                onRestore={onSingleRestore}
                onPermanentDelete={onSinglePermanentDelete}
              />
            </>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <ConfirmDialog
          showConfirmDialog={showConfirmDialog}
          tr={tr}
          onConfirm={onConfirmAction}
          onCancel={onCancelConfirm}
        />
      )}
    </div>
  );
};

interface HeaderProps {
  deletedChainsCount: number;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
  onClose: () => void;
}

const Header: React.FC<HeaderProps> = ({ deletedChainsCount, language, tr, onClose }) => (
  <div className="flex items-center justify-between p-8 border-b border-gray-200 dark:border-slate-600">
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
        <Trash2 size={20} className="text-gray-600 dark:text-slate-300" />
      </div>
      <div>
        <h2 id="recycle-bin-modal-title" className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100">
          {tr('回收箱', 'Recycle bin')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 font-mono">
          {language === 'zh'
            ? `回收箱 • ${deletedChainsCount} 项`
            : `RECYCLE BIN • ${deletedChainsCount} ITEM${deletedChainsCount === 1 ? '' : 'S'}`}
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      aria-label={tr('关闭', 'Close')}
      className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
    >
      <X size={20} className="text-gray-600 dark:text-slate-300" />
    </button>
  </div>
);

const LoadingState: React.FC<{ tr: (zh: string, en: string) => string }> = ({ tr }) => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
        <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
      <p className="text-gray-600 dark:text-slate-400 font-chinese">{tr('正在加载…', 'Loading…')}</p>
    </div>
  </div>
);

const EmptyState: React.FC<{ tr: (zh: string, en: string) => string }> = ({ tr }) => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center max-w-md">
      <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-6">
        <Trash2 size={32} className="text-gray-400 dark:text-slate-500" />
      </div>
      <h3 className="text-xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-2">
        {tr('回收箱为空', 'Recycle bin is empty')}
      </h3>
      <p className="text-gray-600 dark:text-slate-400 leading-relaxed">
        {tr(
          '删除的链条会出现在这里，你可以选择恢复或永久删除它们。',
          'Deleted chains appear here. You can restore them or delete them permanently.'
        )}
      </p>
    </div>
  </div>
);

interface BulkActionsBarProps {
  deletedChainsCount: number;
  selectedChainsCount: number;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
  onSelectAll: () => void;
  onBulkRestore: () => void;
  onBulkPermanentDelete: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  deletedChainsCount,
  selectedChainsCount,
  language,
  tr,
  onSelectAll,
  onBulkRestore,
  onBulkPermanentDelete,
}) => {
  if (deletedChainsCount === 0) return null;

  return (
    <div className="p-6 border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onSelectAll}
            aria-label={selectedChainsCount === deletedChainsCount ? tr('取消全选', 'Clear selection') : tr('全选', 'Select all')}
            className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors"
          >
            {selectedChainsCount === deletedChainsCount ? (
              <CheckSquare size={16} />
            ) : (
              <Square size={16} />
            )}
            <span>
              {selectedChainsCount === deletedChainsCount
                ? tr('取消全选', 'Clear selection')
                : tr('全选', 'Select all')}
            </span>
          </button>
          {selectedChainsCount > 0 && (
            <span className="text-sm text-gray-500 dark:text-slate-400">
              {language === 'zh' ? `已选择 ${selectedChainsCount} 项` : `${selectedChainsCount} selected`}
            </span>
          )}
        </div>

        {selectedChainsCount > 0 && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onBulkRestore}
              aria-label={tr('批量恢复', 'Restore selected')}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors text-sm font-medium"
            >
              <RotateCcw size={16} />
              <span>{tr('批量恢复', 'Restore selected')}</span>
            </button>
            <button
              type="button"
              onClick={onBulkPermanentDelete}
              aria-label={tr('永久删除', 'Delete permanently')}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors text-sm font-medium"
            >
              <Trash2 size={16} />
              <span>{tr('永久删除', 'Delete permanently')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface ChainsListProps {
  deletedChains: DeletedChain[];
  selectedChains: Set<string>;
  formatDeletedTime: (deletedAt: Date) => string;
  onSelectChain: (chainId: string, selected: boolean) => void;
  onRestore: (chainId: string) => void;
  onPermanentDelete: (chainId: string) => void;
}

const ChainsList: React.FC<ChainsListProps> = ({
  deletedChains,
  selectedChains,
  formatDeletedTime,
  onSelectChain,
  onRestore,
  onPermanentDelete,
}) => (
  <div className="flex-1 overflow-y-auto p-8" style={{ overscrollBehavior: 'contain' }}>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
      {deletedChains.map(chain => (
        <DeletedChainCard
          key={chain.id}
          chain={chain}
          isSelected={selectedChains.has(chain.id)}
          onSelect={onSelectChain}
          onRestore={onRestore}
          onPermanentDelete={onPermanentDelete}
          deletedTimeText={formatDeletedTime(chain.deletedAt)}
        />
      ))}
    </div>
  </div>
);

interface ConfirmDialogProps {
  showConfirmDialog: ConfirmDialogState;
  tr: (zh: string, en: string) => string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  showConfirmDialog,
  tr,
  onConfirm,
  onCancel,
}) => (
  <ConfirmationDialog
    isOpen={true}
    title={
      showConfirmDialog.type === 'restore'
        ? tr('确认恢复', 'Confirm restore')
        : tr('确认永久删除', 'Confirm permanent deletion')
    }
    message={
      showConfirmDialog.type === 'restore'
        ? tr(
          `确定要恢复以下 ${showConfirmDialog.chainIds.length} 个链条吗？\n\n${showConfirmDialog.chainNames.join(', ')}`,
          `Restore the following ${showConfirmDialog.chainIds.length} chain(s)?\n\n${showConfirmDialog.chainNames.join(', ')}`
        )
        : tr(
          `确定要永久删除以下 ${showConfirmDialog.chainIds.length} 个链条吗？\n\n${showConfirmDialog.chainNames.join(', ')}\n\n⚠️ 此操作无法撤销，所有数据将被永久删除！`,
          `Permanently delete the following ${showConfirmDialog.chainIds.length} chain(s)?\n\n${showConfirmDialog.chainNames.join(', ')}\n\n⚠️ This cannot be undone. All data will be permanently deleted!`
        )
    }
    confirmText={showConfirmDialog.type === 'restore' ? tr('恢复', 'Restore') : tr('永久删除', 'Delete permanently')}
    cancelText={tr('取消', 'Cancel')}
    confirmButtonClass={
      showConfirmDialog.type === 'restore'
        ? 'bg-green-500 hover:bg-green-600'
        : 'bg-red-500 hover:bg-red-600'
    }
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);

export const RecycleBinModalView = React.memo(RecycleBinModalViewComponent);
