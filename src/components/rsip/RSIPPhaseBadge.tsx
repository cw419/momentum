import type { RSIPStabilityPhase } from '../../types';

interface RSIPPhaseBadgeProps {
  phase: RSIPStabilityPhase;
  size?: 'sm' | 'md';
}

const phaseConfig: Record<RSIPStabilityPhase, {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: string;
}> = {
  E0: {
    label: 'E0 新建',
    bg: 'bg-gray-500/20',
    text: 'text-gray-300',
    border: 'border-gray-500/30',
    icon: '🌱',
  },
  E1: {
    label: 'E1 稳定',
    bg: 'bg-blue-500/20',
    text: 'text-blue-300',
    border: 'border-blue-500/30',
    icon: '🌿',
  },
  E2: {
    label: 'E2 内化',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
    icon: '🌳',
  },
};

export function RSIPPhaseBadge({ phase, size = 'md' }: RSIPPhaseBadgeProps) {
  const config = phaseConfig[phase];
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium flex-shrink-0 whitespace-nowrap
        ${config.bg} ${config.text} border ${config.border}
        ${sizeClasses}
      `}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
