/**
 * DiagramShortVideoLoop - 短视频循环图表
 */

import { memo, useId } from 'react';
import type { DiagramShortVideoLoopProps } from './types';
import { cx, useSvgTitle } from './utils';
import { IconCheck, IconCross } from './shared';

export const DiagramShortVideoLoop = memo(function DiagramShortVideoLoop({
  className,
  title,
  stepPrefix = 'Short ',
  timeLabels = ['19:00', '19:30', '20:00', '20:30'],
  axisLabel = 't',
}: DiagramShortVideoLoopProps) {
  const { id, node } = useSvgTitle(title);
  const markerId = useId().replace(/:/g, '_');

  return (
    <svg
      className={cx('intro-diagram', className)}
      viewBox="0 0 1100 420"
      role="img"
      aria-labelledby={id}
    >
      {node}
      <defs>
        <marker id={markerId} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
          <path d="M 0 0 L 12 6 L 0 12 z" fill="var(--axis)" />
        </marker>
      </defs>

      <rect x="34" y="30" width="1032" height="280" rx="28" fill="var(--panel-bg)" stroke="var(--grid)" />

      <path d="M 90 90 L 1010 90" stroke="var(--axis)" strokeWidth={4} markerEnd={`url(#${markerId})`} />

      {['A', 'B', 'C', 'D'].map((letter, i) => {
        const cx = 210 + i * 220;
        const stepLabel = `${stepPrefix}${letter}`;
        return (
          <g key={letter}>
            <text x={cx} y={62} textAnchor="middle" fontSize={14} fontWeight={800} fill="var(--muted)">
              {stepLabel}
            </text>

            <rect x={cx - 56} y={110} width={112} height={88} rx={18} fill="transparent" stroke="var(--good-weak)" strokeWidth={3} />
            <IconCheck x={cx - 26} y={128} size={52} />

            <rect x={cx - 56} y={206} width={112} height={88} rx={18} fill="transparent" stroke="var(--bad-weak)" strokeWidth={3} />
            <IconCross x={cx - 26} y={224} size={52} />

            <path
              d={`M ${cx} 198 L ${cx} 206`}
              stroke="var(--axis)"
              strokeWidth={3}
              strokeDasharray="5 6"
              opacity={0.5}
            />
          </g>
        );
      })}

      <g opacity={0.9}>
        <path d="M 90 356 L 1010 356" stroke="var(--axis)" strokeWidth={3} />
        {timeLabels.map((t, i) => {
          const x = 210 + i * 220;
          return (
            <g key={t}>
              <line x1={x} y1={350} x2={x} y2={366} stroke="var(--axis)" strokeWidth={3} />
              <text x={x} y={394} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--muted)">
                {t}
              </text>
            </g>
          );
        })}
        <text x={1036} y={362} fontSize={14} fontFamily="ui-serif, Georgia, serif" fontStyle="italic" fill="var(--muted)">
          {axisLabel}
        </text>
      </g>
    </svg>
  );
});
