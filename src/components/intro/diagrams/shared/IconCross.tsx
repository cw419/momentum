import { memo } from 'react';
import type { IconProps } from '../types';

/**
 * Cross icon for negative indicators
 */
export const IconCross = memo(function IconCross({ x, y, size }: IconProps) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M ${size * 0.25} ${size * 0.25} L ${size * 0.75} ${size * 0.75} M ${size * 0.75} ${size * 0.25} L ${size * 0.25} ${size * 0.75}`}
        fill="none"
        stroke="var(--bad)"
        strokeWidth={Math.max(2, size * 0.12)}
        strokeLinecap="round"
      />
    </g>
  );
});
