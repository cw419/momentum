/**
 * DiagramIntegralPreference - 积分偏好图表
 */

import { memo } from 'react';
import type { DiagramIntegralPreferenceProps } from './types';
import { cx, useSvgTitle } from './utils';
import { PlotPanel } from './shared';

export const DiagramIntegralPreference = memo(function DiagramIntegralPreference({
  className,
  title,
  leftLabel = 'Go Study',
  rightLabel = 'Scroll Phone',
  formula = 'I = ∫ W(τ) · V(τ) dτ',
}: DiagramIntegralPreferenceProps) {
  const { id, node } = useSvgTitle(title);

  return (
    <svg
      className={cx('intro-diagram', className)}
      viewBox="0 0 1000 520"
      role="img"
      aria-labelledby={id}
    >
      {node}
      <rect x="0" y="0" width="1000" height="520" rx="28" fill="transparent" />

      <PlotPanel x={36} y={44} w={448} h={404} label={leftLabel} decision="cross" variant="study" />
      <PlotPanel x={516} y={44} w={448} h={404} label={rightLabel} decision="check" variant="phone" />

      <g>
        <rect x={220} y={452} width={560} height={56} rx={18} fill="var(--panel-bg)" stroke="var(--grid)" />
        <text x={500} y={487} textAnchor="middle" fontSize={22} fontFamily="ui-serif, Georgia, serif" fontStyle="italic" fill="var(--ink)">
          {formula}
        </text>
      </g>
    </svg>
  );
});
