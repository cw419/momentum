/**
 * DiagramDelayMeme - 延迟模因图表
 */

import { memo } from 'react';
import type { DiagramDelayMemeProps } from './types';
import { cx, useSvgTitle } from './utils';
import { PlotPanel } from './shared';

interface PanelProps {
  x: number;
  y: number;
  label: string;
  mood: 'no' | 'yes';
  variant: 'delay-now' | 'delay-later';
}

const Panel = memo(function Panel({ x, y, label, mood, variant }: PanelProps) {
  const w = 520;
  const h = 190;

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={26} fill="var(--panel-bg)" stroke="var(--grid)" />
      <text x={x + 22} y={y + 36} fontSize={14} fontWeight={900} fill="var(--ink)">
        {label}
      </text>

      {/* Pixel pet */}
      <g transform={`translate(${x + 26} ${y + 64})`}>
        <rect x={0} y={0} width={110} height={110} rx={24} fill="rgba(0,0,0,0.04)" stroke="var(--grid)" />
        <g transform="translate(18 18)">
          <rect
            x={0}
            y={0}
            width={74}
            height={74}
            rx={18}
            fill={mood === 'yes' ? 'rgba(24,185,106,0.18)' : 'rgba(255,59,48,0.14)'}
            stroke={mood === 'yes' ? 'var(--good-weak)' : 'var(--bad-weak)'}
            strokeWidth={2}
          />
          {/* eyes */}
          <rect x={20} y={26} width={8} height={8} rx={2} fill="var(--ink)" opacity={0.75} />
          <rect x={46} y={26} width={8} height={8} rx={2} fill="var(--ink)" opacity={0.75} />
          {/* mouth */}
          {mood === 'yes' ? (
            <path d="M 24 46 C 30 54, 44 54, 50 46" stroke="var(--ink)" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.75} />
          ) : (
            <path d="M 26 50 L 48 50" stroke="var(--ink)" strokeWidth={4} strokeLinecap="round" opacity={0.75} />
          )}
        </g>
      </g>

      <g transform={`translate(${x + 160} ${y + 56}) scale(0.62)`}>
        <PlotPanel x={0} y={0} w={560} h={310} label="" decision={variant === 'delay-now' ? 'cross' : 'check'} variant={variant} />
      </g>
    </g>
  );
});

export const DiagramDelayMeme = memo(function DiagramDelayMeme({
  className,
  title,
  topLabel = 'Start now',
  bottomLabel = 'Start in 15 minutes',
}: DiagramDelayMemeProps) {
  const { id, node } = useSvgTitle(title);

  return (
    <svg
      className={cx('intro-diagram', className)}
      viewBox="0 0 1100 420"
      role="img"
      aria-labelledby={id}
    >
      {node}

      <Panel x={34} y={32} label={topLabel} mood="no" variant="delay-now" />
      <Panel x={34} y={226} label={bottomLabel} mood="yes" variant="delay-later" />
    </svg>
  );
});
