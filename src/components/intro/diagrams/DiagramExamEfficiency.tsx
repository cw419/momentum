/**
 * DiagramExamEfficiency - 考试效率图表
 */

import { memo } from 'react';
import type { DiagramExamEfficiencyProps } from './types';
import { cx, useSvgTitle } from './utils';
import { PlotPanel } from './shared';

export const DiagramExamEfficiency = memo(function DiagramExamEfficiency({
  className,
  title,
  leftLabel = 'Study (Before Exam)',
  rightLabel = 'Scroll (Before Exam)',
  reviewTitle = 'Review Efficiency',
  reviewSteps = ['1 month', '1 week', '2 days', '1 day', 'night'],
}: DiagramExamEfficiencyProps) {
  const { id, node } = useSvgTitle(title);

  return (
    <svg
      className={cx('intro-diagram', className)}
      viewBox="0 0 1100 520"
      role="img"
      aria-labelledby={id}
    >
      {node}

      <PlotPanel x={30} y={40} w={420} h={360} label={leftLabel} decision="check" variant="study" />
      <PlotPanel x={470} y={40} w={420} h={360} label={rightLabel} decision="cross" variant="phone" />

      <g transform="translate(30 420)">
        <rect x={0} y={0} width={860} height={80} rx={24} fill="var(--panel-bg)" stroke="var(--grid)" />
        <text x={18} y={28} fontSize={12} fontWeight={800} fill="var(--muted)">
          {reviewTitle}
        </text>

        <g transform="translate(18 40)">
          {reviewSteps.map((label, i) => {
            const bw = 120;
            const x = i * (bw + 10);
            const h = [16, 26, 38, 54, 70][i];
            return (
              <g key={label} transform={`translate(${x} 0)`}>
                <rect x={0} y={70 - h} width={bw} height={h} rx={14} fill="var(--bad-fill)" stroke="var(--axis)" strokeWidth={1} opacity={0.9} />
                <text x={bw / 2} y={92} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--muted)">
                  {label}
                </text>
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
});
