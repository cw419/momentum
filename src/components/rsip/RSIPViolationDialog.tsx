import { AlertTriangle, Shield, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { RSIPNode } from '../../types';
import { useI18n } from '../../i18n';

interface RSIPViolationDialogProps {
  isOpen: boolean;
  node: RSIPNode;
  descendants: RSIPNode[];
  groupMessage?: string;
  onConfirm: (payload: { reasonCode?: string; repairHint?: string }) => void;
  onCancel: () => void;
}

export function RSIPViolationDialog({
  isOpen,
  node,
  descendants,
  groupMessage,
  onConfirm,
  onCancel,
}: RSIPViolationDialogProps) {
  const { language, tr } = useI18n();
  const [reasonCode, setReasonCode] = useState('');
  const [repairHint, setRepairHint] = useState('');

  const totalCount = descendants.length + 1;
  const reinforcementLevel = node.reinforcementLevel ?? 0;

  const dangerMessage = useMemo(() => {
    if (reinforcementLevel > 0) {
      if (language.startsWith('zh')) {
        return `当前节点有强化层，违反后将先扣除 1 层（+${reinforcementLevel} -> +${Math.max(0, reinforcementLevel - 1)}）。`;
      }
      return `This node has reinforcement. Violation will remove 1 layer first (+${reinforcementLevel} -> +${Math.max(0, reinforcementLevel - 1)}).`;
    }

    return language.startsWith('zh')
      ? `将删除 ${totalCount} 个节点（当前节点及其子孙）。`
      : `This will remove ${totalCount} node(s), including descendants.`;
  }, [language, reinforcementLevel, totalCount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-label={tr('关闭对话框', 'Close dialog')}
      />

      <div className="relative mx-4 w-full max-w-lg rounded-2xl border border-red-500/30 bg-gray-900 p-6 shadow-xl">
        <button
          type="button"
          onClick={onCancel}
          aria-label={tr('关闭对话框', 'Close dialog')}
          className="focus-ring absolute right-4 top-4 cursor-pointer rounded p-1 text-white/40 transition-colors hover:text-white/70"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-red-500/20 p-3">
            <AlertTriangle className="text-red-400" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{tr('确认违反国策', 'Confirm violation')}</h3>
            <p className="text-sm text-red-300/70">{tr('该操作不可撤销', 'This action cannot be undone')}</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-red-500/10 p-4 text-sm text-red-200">
          <div className="mb-2 flex items-center gap-2">
            <span>{node.emoji || '🧭'}</span>
            <span className="font-semibold">{node.title}</span>
            {reinforcementLevel > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                <Shield size={12} /> +{reinforcementLevel}
              </span>
            )}
          </div>
          <p>{dangerMessage}</p>
          {groupMessage && <p className="mt-2 text-amber-200">{groupMessage}</p>}
        </div>

        {reinforcementLevel <= 0 && descendants.length > 0 && (
          <div className="mb-4 max-h-40 overflow-y-auto rounded-xl bg-red-500/10 p-3">
            <p className="mb-2 text-sm text-red-200">{tr('受影响的子节点：', 'Impacted descendants:')}</p>
            <ul className="space-y-1 text-sm text-red-300/80">
              {descendants.map((descendant) => (
                <li key={descendant.id}>
                  • {descendant.emoji || '🧭'} {descendant.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-3">
          <input
            value={reasonCode}
            onChange={(event) => setReasonCode(event.target.value)}
            placeholder={tr('违反原因（可选）', 'Violation reason (optional)')}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-red-400 focus:outline-none"
          />
          <input
            value={repairHint}
            onChange={(event) => setRepairHint(event.target.value)}
            placeholder={tr('修复提示（可选）', 'Repair hint (optional)')}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-red-400 focus:outline-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 cursor-pointer rounded-xl bg-white/10 py-2.5 text-white transition hover:bg-white/20"
          >
            {tr('取消', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirm({
                reasonCode: reasonCode.trim() || undefined,
                repairHint: repairHint.trim() || undefined,
              })
            }
            className="flex-1 cursor-pointer rounded-xl bg-red-500 py-2.5 font-medium text-white transition hover:bg-red-400"
          >
            {tr('确认违反', 'Confirm violation')}
          </button>
        </div>
      </div>
    </div>
  );
}
