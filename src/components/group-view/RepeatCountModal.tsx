import type React from 'react';
import { X } from 'lucide-react';

export function RepeatCountModal({
  isOpen,
  tr,
  repeatCount,
  setRepeatCount,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  tr: (zh: string, en: string) => string;
  repeatCount: number;
  setRepeatCount: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md animate-scale-in shadow-2xl border border-gray-200 dark:border-slate-600">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold font-chinese text-gray-900 dark:text-slate-100">
            {tr('设置重复次数', 'Set repeat count')}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3 font-chinese">
            {tr('重复次数 (1-99)', 'Repeat count (1-99)')}
          </label>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setRepeatCount(Math.max(1, repeatCount - 1))}
              className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 flex items-center justify-center text-gray-600 dark:text-slate-300 font-bold transition-colors"
              disabled={repeatCount <= 1}
            >
              -
            </button>

            <input
              type="number"
              min="1"
              max="99"
              value={repeatCount}
              onChange={(event) => {
                const value = parseInt(event.target.value) || 1;
                setRepeatCount(Math.min(99, Math.max(1, value)));
              }}
              className="w-20 h-12 text-center text-2xl font-bold bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-slate-100"
            />

            <button
              onClick={() => setRepeatCount(Math.min(99, repeatCount + 1))}
              className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 flex items-center justify-center text-gray-600 dark:text-slate-300 font-bold transition-colors"
              disabled={repeatCount >= 99}
            >
              +
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 font-chinese">
            {tr(
              '设置该任务单元在任务群中需要重复执行的次数',
              'Set how many times this unit must be repeated in the group',
            )}
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-chinese"
          >
            {tr('取消', 'Cancel')}
          </button>
          <button
            onClick={onSave}
            className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors font-chinese font-medium"
          >
            {tr('确认设置', 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}

