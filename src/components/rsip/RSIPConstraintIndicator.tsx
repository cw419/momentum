import { GitBranch, AlertTriangle } from 'lucide-react';

interface RSIPConstraintIndicatorProps {
  descendantCount: number;
  failureCost: number;
}

export function RSIPConstraintIndicator({
  descendantCount,
  failureCost,
}: RSIPConstraintIndicatorProps) {
  const costColorClass =
    failureCost > 5
      ? 'text-red-400'
      : failureCost > 2
      ? 'text-amber-400'
      : 'text-white/60';

  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5 text-white/60">
        <GitBranch size={14} />
        <span>{descendantCount} 子节点</span>
      </div>

      <div className={`flex items-center gap-1.5 ${costColorClass}`}>
        <AlertTriangle size={14} />
        <span>代价 {failureCost}</span>
      </div>
    </div>
  );
}
