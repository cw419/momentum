import { Check, X } from 'lucide-react';
import type { RSIPNode, RSIPStabilityPhase } from '../../types';
import { RSIPPhaseBadge } from './RSIPPhaseBadge';
import { RSIPPhaseProgress } from './RSIPPhaseProgress';
import { RSIPConstraintIndicator } from './RSIPConstraintIndicator';

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

  // 根据稳态阶段和子节点数量决定卡片样式
  const cardBgClass =
    phase === 'E2'
      ? 'bg-emerald-500/10 border-emerald-500/30'
      : phase === 'E1'
      ? 'bg-blue-500/10 border-blue-500/30'
      : 'bg-white/5 border-white/10';

  const shadowClass = descendantCount > 3 ? 'shadow-lg shadow-purple-500/10' : '';

  return (
    <div
      className={`
        relative p-4 rounded-2xl border transition-all
        ${cardBgClass} ${shadowClass}
      `}
    >
      {/* 头部：标题 + 稳态徽章 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1 group/title relative">
          <span className="text-xl flex-shrink-0">{node.emoji || '📌'}</span>
          <h3 className="font-medium text-white truncate cursor-help" title={node.title}>
            {node.title}
          </h3>
          {/* Tooltip for long titles */}
          <div className="absolute left-0 top-full mt-1 z-50 max-w-xs p-2 bg-gray-800 rounded-lg text-sm text-white
            opacity-0 invisible group-hover/title:opacity-100 group-hover/title:visible
            transition-all shadow-xl pointer-events-none break-words">
            {node.title}
          </div>
        </div>
        <RSIPPhaseBadge phase={phase} />
      </div>

      {/* 规则描述 */}
      <p className="text-sm text-white/60 mb-4">{node.rule}</p>

      {/* 稳态进度条 */}
      <RSIPPhaseProgress
        phase={phase}
        consecutiveDays={consecutiveExecutions}
      />

      {/* 约束力指标 */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <RSIPConstraintIndicator
          descendantCount={descendantCount}
          failureCost={failureCost}
        />
      </div>

      {/* 执行按钮 */}
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={onMarkExecuted}
          className="flex-1 flex items-center justify-center gap-2 py-2.5
            bg-emerald-500/20 hover:bg-emerald-500/30
            text-emerald-300 rounded-xl transition-all cursor-pointer"
        >
          <Check size={18} />
          <span>已执行</span>
        </button>

        <button
          type="button"
          onClick={onMarkViolated}
          className="flex-1 flex items-center justify-center gap-2 py-2.5
            bg-red-500/20 hover:bg-red-500/30
            text-red-300 rounded-xl transition-all cursor-pointer"
        >
          <X size={18} />
          <span>已违反</span>
        </button>
      </div>
    </div>
  );
}
