/**
 * DiagramSacredSeat - 神圣座位图表
 */

import { memo, useId } from 'react';
import type { DiagramSacredSeatProps } from './types';
import { cx, useSvgTitle } from './utils';
import { PlotPanel } from './shared';

export const DiagramSacredSeat = memo(function DiagramSacredSeat({
  className,
  title,
  leftLabel = 'Quit Focus (Normal)',
  rightLabel = 'Quit Focus (Sacred Seat)',
  subtitle = 'Value Compression',
}: DiagramSacredSeatProps) {
  const { id, node } = useSvgTitle(title);
  const markerId = useId().replace(/:/g, '_');

  return (
    <svg
      className={cx('intro-diagram', className)}
      viewBox="0 0 1100 440"
      role="img"
      aria-labelledby={id}
    >
      {node}

      <PlotPanel x={40} y={46} w={430} h={340} label={leftLabel} decision="cross" variant="quit" />
      <PlotPanel x={630} y={46} w={430} h={340} label={rightLabel} decision="cross" variant="quit-sacred" />

      <defs>
        <marker id={markerId} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
          <path d="M 0 0 L 12 6 L 0 12 z" fill="var(--axis)" />
        </marker>
      </defs>

      <path d="M 500 216 L 600 216" stroke="var(--axis)" strokeWidth={4} markerEnd={`url(#${markerId})`} opacity={0.75} />
      <text x={550} y={248} textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--muted)">
        {subtitle}
      </text>
    </svg>
  );
});
