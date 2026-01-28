import { AlertTriangle, GitBranch } from 'lucide-react';

interface RSIPConstraintIndicatorProps {
  descendantCount: number;
  failureCost: number;
}

export function RSIPConstraintIndicator({ descendantCount, failureCost }: RSIPConstraintIndicatorProps) {
  let costColorClass = 'text-slate-600 dark:text-white/60';
  if (failureCost > 5) {
    costColorClass = 'text-rose-700 dark:text-red-300';
  } else if (failureCost > 2) {
    costColorClass = 'text-amber-700 dark:text-amber-300';
  }

  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5 text-slate-600 dark:text-white/60">
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
