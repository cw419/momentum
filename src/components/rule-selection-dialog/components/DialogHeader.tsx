import { CheckCircle, Clock, X } from 'lucide-react';
import type { ActionType } from '../types';
import { getActionBgClass, getActionColorClass, getActionDisplayName } from '../utils';

export function DialogHeader({
  actionType,
  tr,
  language,
  onCancel,
}: {
  actionType: ActionType;
  tr: (zh: string, en: string) => string;
  language: string;
  onCancel: () => void;
}) {
  const actionColor = getActionColorClass(actionType);
  const actionBg = getActionBgClass(actionType);
  const actionLabel = getActionDisplayName(actionType, tr);

  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${actionBg}`}>
          {actionType === 'pause' ? (
            <Clock className={actionColor} size={20} />
          ) : (
            <CheckCircle className={actionColor} size={20} />
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            <span id="rule-selection-dialog-title">{tr('选择例外规则', 'Choose exception rule')}</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'zh' ? `为${actionLabel}操作选择适用的规则` : `Choose a rule for ${actionLabel}`}
          </p>
        </div>
      </div>

      <button
        onClick={onCancel}
        aria-label={tr('关闭对话框', 'Close dialog')}
        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
      >
        <X size={20} />
      </button>
    </div>
  );
}
