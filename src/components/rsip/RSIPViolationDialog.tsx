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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative p-6 bg-gray-900 rounded-2xl border border-red-500/30 max-w-md mx-4 shadow-xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 text-white/40 hover:text-white/70 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-500/20 rounded-xl">
            <AlertTriangle className="text-red-400" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">确认违反定式？</h3>
            <p className="text-sm text-red-300/70">此操作不可撤销</p>
          </div>
        </div>

        {/* Deletion list */}
        <div className="p-4 bg-red-500/10 rounded-xl mb-4 max-h-48 overflow-y-auto">
          <p className="text-sm text-red-200 mb-2">
            将删除以下 {totalCount} 个定式：
          </p>
          <ul className="space-y-1 text-sm text-red-300/80">
            <li>• {node.emoji || '📌'} {node.title}（当前）</li>
            {descendants.map(d => (
              <li key={d.id}>• {d.emoji || '📌'} {d.title}</li>
            ))}
          </ul>
        </div>

        {/* Warning message */}
        <p className="text-sm text-white/60 mb-4">
          这相当于{' '}
          <span className="text-red-400 font-bold">{totalCount} 天</span>{' '}
          的努力白费。
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-400 text-white font-medium rounded-xl transition-all cursor-pointer"
          >
            确认违反
          </button>
        </div>
      </div>
    </div>
  );
}
