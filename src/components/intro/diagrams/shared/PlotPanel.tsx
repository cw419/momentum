import { memo } from 'react';
import type { PlotPanelProps, PlotPanelVariant } from '../types';
import { generatePath } from '../utils';
import { IconCheck } from './IconCheck';
import { IconCross } from './IconCross';

/**
 * Get the value function based on variant type
 */
function getValueFunction(variant: PlotPanelVariant): (t: number) => number {
  switch (variant) {
    case 'study':
      return (t) => (t - 1.5) * Math.exp(-0.2 * t) * 0.8;
    case 'phone':
      return (t) => (1.5 - t) * Math.exp(-0.2 * t) * 0.8;
    case 'quit':
      return (t) => (1.0 - t) * Math.exp(-0.3 * t);
    case 'quit-sacred':
      return (t) => -Math.cos(0.8 * t) * Math.exp(-0.15 * t) * 0.8;
    case 'delay-now':
      return (t) => (t - 0.8) * Math.exp(-0.6 * t) * 2.0;
    case 'delay-later':
      return (t) => (t - 2.0) * Math.exp(-0.3 * t) * 0.6;
  }
}

/**
 * Plot panel component for displaying mathematical curves
 */
export const PlotPanel = memo(function PlotPanel({
  x,
  y,
  w,
  h,
  label,
  decision,
  variant,
}: PlotPanelProps) {
  const pad = 18;
  const gx = x + pad;
  const gy = y + 46;
  const gw = w - pad * 2;
  const gh = h - 70;

  const x0 = gx + 38;
  const y0 = gy + gh * 0.72;
  const x1 = gx + gw - 18;
  const yTop = gy + 18;

  const gridCount = 4;
  const border = decision === 'check' ? 'var(--good-weak)' : 'var(--bad-weak)';
  const scaleY = (y0 - yTop) * 0.55;

  const wFunc = (t: number) => 1.4 * Math.exp(-0.6 * t);
  const wCurve = generatePath(wFunc, x0, x1, y0, scaleY);

  const vFunc = getValueFunction(variant);
  const vCurve = generatePath(vFunc, x0, x1, y0, scaleY);

  const vFill =
    `M ${x0} ${y0} ` +
    vCurve.replace(/^M [^ ]+ [^ ]+/, '').trim() +
    ` L ${x1} ${y0} Z`;

  const fillColor =
    variant === 'phone' || variant.startsWith('quit')
      ? 'var(--bad-fill)'
      : 'var(--good-fill)';

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={22}
        fill="var(--panel-bg)"
        stroke={border}
        strokeWidth={2}
      />

      <text x={x + 22} y={y + 30} fontSize={14} fontWeight={700} fill="var(--ink)">
        {label}
      </text>

      {decision === 'check' ? (
        <IconCheck x={x + w - 54} y={y + 12} size={42} />
      ) : (
        <IconCross x={x + w - 54} y={y + 12} size={42} />
      )}

      {Array.from({ length: gridCount }).map((_, i) => {
        const px = x0 + ((x1 - x0) * (i + 1)) / (gridCount + 1);
        return (
          <line
            key={`gv-${i}`}
            x1={px}
            y1={yTop}
            x2={px}
            y2={y0 + 120}
            stroke="var(--grid)"
            strokeWidth={1}
          />
        );
      })}

      {Array.from({ length: gridCount }).map((_, i) => {
        const py = yTop + ((y0 - yTop) * (i + 1)) / (gridCount + 1);
        return (
          <line
            key={`gh-${i}`}
            x1={x0}
            y1={py}
            x2={x1}
            y2={py}
            stroke="var(--grid)"
            strokeWidth={1}
          />
        );
      })}

      <line x1={x0} y1={yTop} x2={x0} y2={y0 + 120} stroke="var(--axis)" strokeWidth={2} />
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="var(--axis)" strokeWidth={2} />

      <path d={vFill} fill={fillColor} opacity={0.9} />
      <path d={wCurve} fill="none" stroke="var(--w)" strokeWidth={3} strokeDasharray="10 8" />
      <path d={vCurve} fill="none" stroke="var(--v)" strokeWidth={3} />

      <text x={x0 + 10} y={yTop + 20} fontSize={12} fontWeight={700} fill="var(--muted)">
        W(τ), V(τ)
      </text>
      <text
        x={x0 + 18}
        y={yTop + 64}
        fontSize={28}
        fontFamily="ui-serif, Georgia, serif"
        fontStyle="italic"
        fill="var(--w)"
      >
        W
      </text>
      <text
        x={x0 + 36}
        y={yTop + 72}
        fontSize={18}
        fontFamily="ui-serif, Georgia, serif"
        fontStyle="italic"
        fill="var(--w)"
      >
        (τ)
      </text>
      <text
        x={x0 + 42}
        y={y0 + 90}
        fontSize={30}
        fontFamily="ui-serif, Georgia, serif"
        fontStyle="italic"
        fill="var(--v)"
      >
        V
      </text>
      <text
        x={x0 + 60}
        y={y0 + 98}
        fontSize={18}
        fontFamily="ui-serif, Georgia, serif"
        fontStyle="italic"
        fill="var(--v)"
      >
        (τ)
      </text>

      <text
        x={x1 + 6}
        y={y0 + 10}
        fontSize={16}
        fontFamily="ui-serif, Georgia, serif"
        fontStyle="italic"
        fill="var(--axis)"
      >
        τ
      </text>
    </g>
  );
});
