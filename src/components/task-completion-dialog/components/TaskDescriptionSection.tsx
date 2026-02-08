import React from 'react';
import { FileText, History, RotateCcw } from 'lucide-react';

export const TaskDescriptionSection: React.FC<{
  tr: (zh: string, en: string) => string;
  isDurationless: boolean;
  description: string;
  onDescriptionChange: (value: string) => void;
  onDescriptionKeyDown: (event: React.KeyboardEvent) => void;
  descriptionInputRef: React.RefObject<HTMLInputElement>;
  recentDescriptions: string[];
  showQuickFill: boolean;
  onToggleQuickFill: () => void;
  onQuickFill: (description: string) => void;
}> = ({
  tr,
  isDurationless,
  description,
  onDescriptionChange,
  onDescriptionKeyDown,
  descriptionInputRef,
  recentDescriptions,
  showQuickFill,
  onToggleQuickFill,
  onQuickFill,
}) => {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="text-gray-500 dark:text-gray-400" size={16} />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {tr('任务描述', 'Task description')}
            {isDurationless ? ' *' : tr('（可选）', ' (optional)')}
          </label>
        </div>

        {recentDescriptions.length > 0 && (
          <button
            type="button"
            onClick={onToggleQuickFill}
            aria-label={tr('显示历史描述', 'Show history')}
            aria-expanded={showQuickFill}
            className="flex items-center space-x-1 text-xs text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <History size={14} />
            <span>{tr('历史', 'History')}</span>
          </button>
        )}
      </div>

      <input
        ref={descriptionInputRef}
        type="text"
        name="description"
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
        onKeyDown={onDescriptionKeyDown}
        placeholder={
          isDurationless
            ? tr(
                '例如：完成 CS61A 的第一部分（按 Tab 添加备注或自动填充）',
                'e.g. Finish CS61A Part 1 (Tab to add notes or auto-fill)',
              )
            : tr(
                '例如：完成 CS61A 的第一部分（可选，按 Tab 添加备注）',
                'e.g. Finish CS61A Part 1 (optional, Tab to add notes)',
              )
        }
        aria-label={tr('任务描述', 'Task description')}
        aria-required={isDurationless}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
        required={isDurationless}
      />

      {showQuickFill && recentDescriptions.length > 0 && (
        <div className="animate-slide-down mt-2 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-700/50 dark:bg-blue-900/20">
          <div className="mb-2 flex items-center space-x-2">
            <RotateCcw className="text-blue-600 dark:text-blue-400" size={14} />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              {tr('最近的任务描述', 'Recent descriptions')}
            </span>
          </div>
          <div className="space-y-1">
            {recentDescriptions.map((desc, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onQuickFill(desc)}
                className="w-full truncate rounded-lg px-3 py-2 text-left text-sm text-blue-800 transition-colors hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-800/30"
                title={desc}
              >
                {desc}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {isDurationless
          ? tr(
              '按 Tab 添加备注或自动填充，按 Shift+Tab 显示历史，按 Enter 完成',
              'Tab to add notes or auto-fill, Shift+Tab for history, Enter to complete',
            )
          : tr(
              '任务描述可选，按 Tab 添加备注，按 Enter 完成',
              'Description optional; Tab to add notes; Enter to complete',
            )}
      </p>
    </div>
  );
};
