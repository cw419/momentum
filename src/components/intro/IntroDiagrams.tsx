import { useId } from 'react';

type DiagramProps = {
  className?: string;
  title?: string;
};

type DiagramIntegralPreferenceProps = DiagramProps & {
  leftLabel?: string;
  rightLabel?: string;
  formula?: string;
};

type DiagramShortVideoLoopProps = DiagramProps & {
  stepPrefix?: string;
  timeLabels?: string[];
  axisLabel?: string;
};

type DiagramExamEfficiencyProps = DiagramProps & {
  leftLabel?: string;
  rightLabel?: string;
  reviewTitle?: string;
  reviewSteps?: string[];
};

type DiagramSacredSeatProps = DiagramProps & {
  leftLabel?: string;
  rightLabel?: string;
  subtitle?: string;
};

type DiagramDelayMemeProps = DiagramProps & {
  topLabel?: string;
  bottomLabel?: string;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ');
}

function useSvgTitle(title?: string) {
  const rawId = useId();
  const id = rawId.replace(/:/g, '_');
  if (!title) return { id: undefined, node: null } as const;
  return { id, node: <title id={id}>{title}</title> } as const;
}

function IconCheck({ x, y, size }: { x: number; y: number; size: number }) {
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
}

function IconCross({ x, y, size }: { x: number; y: number; size: number }) {
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
}

function PlotPanel({
  x,
  y,
  w,
  h,
  label,
  decision,
  variant,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  decision: 'check' | 'cross';
  variant: 'study' | 'phone' | 'quit' | 'quit-sacred' | 'delay-now' | 'delay-later';
}) {
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

  // Math plotting helper
  const generatePath = (fn: (t: number) => number, xStart: number, xEnd: number, yZero: number, yMaxHeight: number) => {
    const points: [number, number][] = [];
    const steps = 60;
    const domainMax = 6; // Plot from t=0 to t=6

    for (let i = 0; i <= steps; i++) {
      const percent = i / steps;
      const px = xStart + percent * (xEnd - xStart);
      const t = percent * domainMax;
      const val = fn(t);

      // Clamp to avoid drawing way outside
      // SVG Coord: y increases down. Positive val -> y < yZero.
      const py = yZero - val * yMaxHeight;

      // Soft Clamp at top/bottom of the panel to prevent ugly overlaps
      // Panel top is yTop (~gy + 18), bottom is y0 + something
      // Just let it clip naturally or ensure functions don't exceed ~1.5
      points.push([px, py]);
    }

    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  };

  const scaleY = (y0 - yTop) * 0.55; // Reduced scale to prevent overflow

  // 1. Weight Function W(τ) = A * exp(-kτ)
  // Hyperbolic discounting proxy
  const wFunc = (t: number) => 1.4 * Math.exp(-0.6 * t);
  const wCurve = generatePath(wFunc, x0, x1, y0, scaleY);

  // 2. Value Function V(τ)
  let vFunc = (_t: number) => 0;

  switch (variant) {
    case 'study':
      // Study: Initial Pain (Negative), Future Gain (Positive)
      // V(t) = -A * t * exp(-kt) + Shift? 
      // Let's use: (t - 1.2) to shift crossing point.
      // And decay to 0 eventually? Or logistic?
      // Simple model: V = (t - 1.5) * exp(-0.4*t)
      // t=0 -> -1.5 (Pain)
      // t=1.5 -> 0
      // t=4 -> Positive
      vFunc = (t) => (t - 1.5) * Math.exp(-0.2 * t) * 0.8;
      break;
    case 'phone':
      // Phone: Initial Pleasure (Positive), Future Pain (Negative)
      // V = (1.5 - t) * exp(-0.4*t)
      // t=0 -> 1.5 (Fun)
      // t=1.5 -> 0
      // t=4 -> Negative
      vFunc = (t) => (1.5 - t) * Math.exp(-0.2 * t) * 0.8;
      break;
    case 'quit':
      // Trap: Looks good initially? Or just straight negative?
      // Usually procrastination trap: "Taking a break" feels good (pos), leads to failure (neg)
      // Same as phone basically but maybe deeper dip
      vFunc = (t) => (1.0 - t) * Math.exp(-0.3 * t);
      break;
    case 'quit-sacred':
      // Sacred Seat: Value is compressed? 
      // Maybe oscillating or flat? 
      // Let's keep the dampened wave
      vFunc = (t) => -Math.cos(0.8 * t) * Math.exp(-0.15 * t) * 0.8;
      break;
    case 'delay-now':
      // Start Now: High Cost immediately
      vFunc = (t) => (t - 0.8) * Math.exp(-0.6 * t) * 2.0;
      break;
    case 'delay-later':
      // Delay: Cost is shifted/dampened
      vFunc = (t) => (t - 2.0) * Math.exp(-0.3 * t) * 0.6;
      break;
  }

  const vCurve = generatePath(vFunc, x0, x1, y0, scaleY);

  const vFill =
    `M ${x0} ${y0} ` +
    vCurve.replace(/^M [^ ]+ [^ ]+/, '').trim() +
    ` L ${x1} ${y0} Z`;

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={22} fill="var(--panel-bg)" stroke={border} strokeWidth={2} />

      <text x={x + 22} y={y + 30} fontSize={14} fontWeight={700} fill="var(--ink)">
        {label}
      </text>

      {decision === 'check' ? <IconCheck x={x + w - 54} y={y + 12} size={42} /> : <IconCross x={x + w - 54} y={y + 12} size={42} />}

      {Array.from({ length: gridCount }).map((_, i) => {
        const px = x0 + ((x1 - x0) * (i + 1)) / (gridCount + 1);
        return <line key={`gv-${i}`} x1={px} y1={yTop} x2={px} y2={y0 + 120} stroke="var(--grid)" strokeWidth={1} />;
      })}
      {Array.from({ length: gridCount }).map((_, i) => {
        const py = yTop + ((y0 - yTop) * (i + 1)) / (gridCount + 1);
        return <line key={`gh-${i}`} x1={x0} y1={py} x2={x1} y2={py} stroke="var(--grid)" strokeWidth={1} />;
      })}

      <line x1={x0} y1={yTop} x2={x0} y2={y0 + 120} stroke="var(--axis)" strokeWidth={2} />
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="var(--axis)" strokeWidth={2} />

      <path d={vFill} fill={variant === 'phone' || variant.startsWith('quit') ? 'var(--bad-fill)' : 'var(--good-fill)'} opacity={0.9} />
      <path d={wCurve} fill="none" stroke="var(--w)" strokeWidth={3} strokeDasharray="10 8" />
      <path d={vCurve} fill="none" stroke="var(--v)" strokeWidth={3} />

      <text x={x0 + 10} y={yTop + 20} fontSize={12} fontWeight={700} fill="var(--muted)">
        W(τ), V(τ)
      </text>
      <text x={x0 + 18} y={yTop + 64} fontSize={28} fontFamily="ui-serif, Georgia, serif" fontStyle="italic" fill="var(--w)">
        W
      </text>
      <text x={x0 + 36} y={yTop + 72} fontSize={18} fontFamily="ui-serif, Georgia, serif" fontStyle="italic" fill="var(--w)">
        (τ)
      </text>
      <text x={x0 + 42} y={y0 + 90} fontSize={30} fontFamily="ui-serif, Georgia, serif" fontStyle="italic" fill="var(--v)">
        V
      </text>
      <text x={x0 + 60} y={y0 + 98} fontSize={18} fontFamily="ui-serif, Georgia, serif" fontStyle="italic" fill="var(--v)">
        (τ)
      </text>

      <text x={x1 + 6} y={y0 + 10} fontSize={16} fontFamily="ui-serif, Georgia, serif" fontStyle="italic" fill="var(--axis)">
        τ
      </text>
    </g>
  );
}

export function DiagramIntegralPreference({
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
}

export function DiagramShortVideoLoop({
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
}

export function DiagramExamEfficiency({
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
}

export function DiagramSacredSeat({
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
}

export function DiagramDelayMeme({
  className,
  title,
  topLabel = 'Start now',
  bottomLabel = 'Start in 15 minutes',
}: DiagramDelayMemeProps) {
  const { id, node } = useSvgTitle(title);

  const Panel = ({
    x,
    y,
    label,
    mood,
    variant,
  }: {
    x: number;
    y: number;
    label: string;
    mood: 'no' | 'yes';
    variant: 'delay-now' | 'delay-later';
  }) => {
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
            <rect x={0} y={0} width={74} height={74} rx={18} fill={mood === 'yes' ? 'rgba(24,185,106,0.18)' : 'rgba(255,59,48,0.14)'} stroke={mood === 'yes' ? 'var(--good-weak)' : 'var(--bad-weak)'} strokeWidth={2} />
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
  };

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
}
