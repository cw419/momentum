/**
 * TimerRing — 环绕计时器的 SVG 进度圆环
 *
 * 有时长任务：stroke-dashoffset 随 progress 收缩，表示剩余时间
 * 无时长任务：显示完整环 + 呼吸动画，表示任务进行中
 * 暂停状态：颜色变灰，动画停止
 */

interface TimerRingProps {
  /** 0-100，仅有时长任务使用 */
  progress: number;
  isDurationless: boolean;
  isPaused: boolean;
  className?: string;
}

const RADIUS = 130;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = 300;

export function TimerRing({
  progress,
  isDurationless,
  isPaused,
  className = '',
}: TimerRingProps) {
  const offset = isDurationless ? 0 : CIRCUMFERENCE * (1 - progress / 100);

  const ringClass = [
    'transition-[stroke-dashoffset] duration-1000 ease-out',
    isPaused
      ? 'stroke-gray-300 dark:stroke-slate-600'
      : 'stroke-primary-500 dark:stroke-primary-400',
    isDurationless && !isPaused ? 'animate-breathe-ring' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={`-rotate-90 ${className}`}
      aria-hidden="true"
    >
      {/* 底轨 */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        strokeWidth="2.5"
        className="stroke-gray-200 dark:stroke-slate-800"
      />
      {/* 进度环 */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        className={ringClass}
      />
    </svg>
  );
}
