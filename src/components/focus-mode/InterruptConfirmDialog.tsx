import { AlertTriangle } from 'lucide-react';
import { useI18n } from '../../i18n';

interface InterruptConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function InterruptConfirmDialog({ isOpen, onCancel, onConfirm }: InterruptConfirmDialogProps) {
  const { tr } = useI18n();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-red-200 dark:border-red-800">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>

          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 font-chinese">
            {tr('确认中断任务', 'Interrupt task?')}
          </h3>

          <p className="text-gray-600 dark:text-gray-300 mb-8 font-chinese leading-relaxed">
            {tr(
              '中断任务将导致任务失败，主链记录将清空为零。你确定要中断当前任务吗？',
              'Interrupting will fail the task and reset your main streak to zero. Are you sure you want to interrupt?'
            )}
          </p>

          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-chinese transition-all duration-300"
            >
              {tr('取消', 'Cancel')}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-6 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-chinese transition-all duration-300 shadow-lg"
            >
              {tr('确认中断', 'Interrupt')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

