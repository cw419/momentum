import { memo } from 'react';
import type { IconProps } from '../types';

/**
 * Checkmark icon for positive indicators
 */
export const IconCheck = memo(function IconCheck({ x, y, size }: IconProps) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M ${size * 0.18} ${size * 0.52} L ${size * 0.41} ${size * 0.74} L ${size * 0.82} ${size * 0.28}`}
        fill="none"
        stroke="var(--good)"
        strokeWidth={Math.max(2, size * 0.12)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
});
