import React from 'react';
import { CheckCircle, X } from 'lucide-react';

export const TaskCompletionDialogHeader: React.FC<{
  chainName: string;
  tr: (zh: string, en: string) => string;
  onCancel: () => void;
}> = ({ chainName, tr, onCancel }) => {
  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30">
          <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
        </div>
        <div>
          <h2 id="task-completion-dialog-title" className="text-xl font-bold text-gray-900 dark:text-white">
            {tr('完成任务', 'Complete task')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{chainName}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onCancel}
        aria-label={tr('关闭', 'Close')}
        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
      >
        <X size={20} />
      </button>
    </div>
  );
};

