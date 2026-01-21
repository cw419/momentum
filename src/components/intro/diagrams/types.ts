/**
 * Type definitions for intro diagrams
 */

export type DiagramProps = {
  className?: string;
  title?: string;
};

export type DiagramIntegralPreferenceProps = DiagramProps & {
  leftLabel?: string;
  rightLabel?: string;
  formula?: string;
};

export type DiagramShortVideoLoopProps = DiagramProps & {
  stepPrefix?: string;
  timeLabels?: string[];
  axisLabel?: string;
};

export type DiagramExamEfficiencyProps = DiagramProps & {
  leftLabel?: string;
  rightLabel?: string;
  reviewTitle?: string;
  reviewSteps?: string[];
};

export type DiagramSacredSeatProps = DiagramProps & {
  leftLabel?: string;
  rightLabel?: string;
  subtitle?: string;
};

export type DiagramDelayMemeProps = DiagramProps & {
  topLabel?: string;
  bottomLabel?: string;
};

export type PlotPanelVariant =
  | 'study'
  | 'phone'
  | 'quit'
  | 'quit-sacred'
  | 'delay-now'
  | 'delay-later';

export type PlotPanelDecision = 'check' | 'cross';

export type PlotPanelProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  decision: PlotPanelDecision;
  variant: PlotPanelVariant;
};

export type IconProps = {
  x: number;
  y: number;
  size: number;
};
