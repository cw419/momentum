import { AlertTriangle, X } from 'lucide-react';
import type { RSIPNode } from '../../types';

interface RSIPViolationDialogProps {
  isOpen: boolean;
  node: RSIPNode;
  descendants: RSIPNode[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function RSIPViolationDialog({
  isOpen,
  node,
  descendants,
  onConfirm,
  onCancel,
}: RSIPViolationDialogProps) {
  if (!isOpen) return null;

  const totalCount = descendants.length + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Close dialog"
      />

      {/* Dialog */}
      <div className="relative mx-4 max-w-md rounded-2xl border border-red-500/30 bg-gray-900 p-6 shadow-xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close dialog"
          className="focus-ring absolute right-4 top-4 cursor-pointer rounded p-1 text-white/40 transition-colors hover:text-white/70"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-red-500/20 p-3">
            <AlertTriangle className="text-red-400" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">确认违反定式？</h3>
            <p className="text-sm text-red-300/70">此操作不可撤销</p>
          </div>
        </div>

        {/* Deletion list */}
        <div className="mb-4 max-h-48 overflow-y-auto rounded-xl bg-red-500/10 p-4">
          <p className="mb-2 text-sm text-red-200">
            将删除以下 {totalCount} 个定式：
          </p>
          <ul className="space-y-1 text-sm text-red-300/80">
            <li>
              • {node.emoji || '📌'} {node.title}（当前）
            </li>
            {descendants.map((d) => (
              <li key={d.id}>
                • {d.emoji || '📌'} {d.title}
              </li>
            ))}
          </ul>
        </div>

        {/* Warning message */}
        <p className="mb-4 text-sm text-white/60">
          这相当于{' '}
          <span className="font-bold text-red-400">{totalCount} 天</span>{' '}
          的努力白费。
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 cursor-pointer rounded-xl bg-white/10 py-2.5 text-white transition hover:bg-white/20"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 cursor-pointer rounded-xl bg-red-500 py-2.5 font-medium text-white transition hover:bg-red-400"
          >
            确认违反
          </button>
        </div>
      </div>
    </div>
  );
}
