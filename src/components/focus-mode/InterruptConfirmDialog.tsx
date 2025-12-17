import { AlertTriangle } from 'lucide-react';

interface InterruptConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function InterruptConfirmDialog({ isOpen, onCancel, onConfirm }: InterruptConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-red-200 dark:border-red-800">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>

          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 font-chinese">确认中断任务</h3>

          <p className="text-gray-600 dark:text-gray-300 mb-8 font-chinese leading-relaxed">
            中断任务将导致任务失败，主链记录将清空为零。你确定要中断当前任务吗？
          </p>

          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-chinese transition-all duration-300"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-6 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-chinese transition-all duration-300 shadow-lg"
            >
              确认中断
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

