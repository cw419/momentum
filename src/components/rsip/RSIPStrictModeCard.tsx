import { Check, X } from 'lucide-react';
import type { RSIPNode, RSIPStabilityPhase } from '../../types';
import { RSIPConstraintIndicator } from './RSIPConstraintIndicator';
import { RSIPPhaseBadge } from './RSIPPhaseBadge';
import { RSIPPhaseProgress } from './RSIPPhaseProgress';

interface RSIPStrictModeCardProps {
  node: RSIPNode;
  descendantCount: number;
  failureCost: number;
  onMarkExecuted: () => void;
  onMarkViolated: () => void;
}

export function RSIPStrictModeCard({
  node,
  descendantCount,
  failureCost,
  onMarkExecuted,
  onMarkViolated,
}: RSIPStrictModeCardProps) {
  const phase: RSIPStabilityPhase = node.stabilityPhase ?? 'E0';
  const consecutiveExecutions = node.consecutiveExecutions ?? 0;

  const cardBgClass =
    phase === 'E2'
      ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30'
      : phase === 'E1'
        ? 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30'
        : 'bg-white border-slate-200 dark:bg-white/5 dark:border-white/10';

  const hoverBorderClass =
    phase === 'E2'
      ? 'hover:border-emerald-300 dark:hover:border-emerald-500/50'
      : phase === 'E1'
        ? 'hover:border-blue-300 dark:hover:border-blue-500/50'
        : 'hover:border-slate-300 dark:hover:border-white/20';

  const depthShadowClass =
    descendantCount > 3 ? 'shadow-md shadow-indigo-500/10 dark:shadow-indigo-500/10' : 'shadow-sm';

  return (
    <div
      className={`
        relative p-4 rounded-2xl border transition-all
        ${cardBgClass} ${depthShadowClass}
        hover:shadow-lg ${hoverBorderClass}
      `}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1 group/title relative">
          <span className="text-xl flex-shrink-0">{node.emoji || '📌'}</span>
          <h3 className="font-medium text-slate-900 dark:text-white truncate cursor-help" title={node.title}>
            {node.title}
          </h3>
          <div
            className="absolute left-0 top-full mt-1 z-50 max-w-xs p-2 bg-gray-800 rounded-lg text-sm text-white
              opacity-0 invisible group-hover/title:opacity-100 group-hover/title:visible
              transition-all shadow-xl pointer-events-none break-words"
          >
            {node.title}
          </div>
        </div>
        <RSIPPhaseBadge phase={phase} />
      </div>

      <p className="text-sm text-slate-700 dark:text-white/60 mb-4">{node.rule}</p>

      <RSIPPhaseProgress phase={phase} consecutiveDays={consecutiveExecutions} />

      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
        <RSIPConstraintIndicator descendantCount={descendantCount} failureCost={failureCost} />
      </div>

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={onMarkExecuted}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer font-medium
            bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm
            dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-200 dark:shadow-none
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white
            dark:focus-visible:ring-emerald-500/60 dark:focus-visible:ring-offset-slate-950"
        >
          <Check size={18} />
          <span>已执行</span>
        </button>

        <button
          type="button"
          onClick={onMarkViolated}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer font-medium
            bg-red-600 hover:bg-red-700 text-white shadow-sm
            dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:text-red-200 dark:shadow-none
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white
            dark:focus-visible:ring-red-500/60 dark:focus-visible:ring-offset-slate-950"
        >
          <X size={18} />
          <span>已违反</span>
        </button>
      </div>
    </div>
  );
}
