import React from 'react';
import { CheckSquare, RotateCcw, Square, Trash2 } from 'lucide-react';

interface BulkActionsBarProps {
  deletedChainsCount: number;
  selectedChainsCount: number;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
  onSelectAll: () => void;
  onBulkRestore: () => void;
  onBulkPermanentDelete: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
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
            aria-label={
              selectedChainsCount === deletedChainsCount
                ? tr('取消全选', 'Clear selection')
                : tr('全选', 'Select all')
            }
            className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors"
          >
            {selectedChainsCount === deletedChainsCount ? <CheckSquare size={16} /> : <Square size={16} />}
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

