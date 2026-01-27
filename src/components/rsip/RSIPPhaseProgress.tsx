import type { RSIPStabilityPhase } from '../../types';

interface RSIPPhaseProgressProps {
  phase: RSIPStabilityPhase;
  consecutiveDays: number;
}

const PHASE_THRESHOLDS: Record<RSIPStabilityPhase, number> = {
  E0: 7,
  E1: 21,
  E2: 0,
};

export function RSIPPhaseProgress({ phase, consecutiveDays }: RSIPPhaseProgressProps) {
  const threshold = PHASE_THRESHOLDS[phase];
  const isMaxPhase = phase === 'E2';
  const progress = isMaxPhase ? 100 : Math.min((consecutiveDays / threshold) * 100, 100);

  const gradientClass =
    phase === 'E0'
      ? 'bg-gradient-to-r from-slate-400 to-blue-500'
      : phase === 'E1'
        ? 'bg-gradient-to-r from-blue-500 to-emerald-500'
        : 'bg-gradient-to-r from-emerald-500 to-emerald-400';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600 dark:text-white/50">
          {isMaxPhase ? '已内化' : `→ ${phase === 'E0' ? 'E1' : 'E2'}`}
        </span>
        <span className="text-slate-800 dark:text-white/70 font-medium">
          {isMaxPhase ? '完成' : `${consecutiveDays}/${threshold} 天`}
        </span>
      </div>

      <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${gradientClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
