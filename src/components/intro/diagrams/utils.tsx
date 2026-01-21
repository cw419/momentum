import { useId } from 'react';

/**
 * Utility function to join class names
 */
export function cx(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Hook to generate accessible SVG title with unique ID
 */
export function useSvgTitle(title?: string) {
  const rawId = useId();
  const id = rawId.replace(/:/g, '_');

  if (!title) {
    return { id: undefined, node: null } as const;
  }

  return {
    id,
    node: <title id={id}>{title}</title>,
  } as const;
}

/**
 * Generate SVG path from a mathematical function
 */
export function generatePath(
  fn: (t: number) => number,
  xStart: number,
  xEnd: number,
  yZero: number,
  yMaxHeight: number
): string {
  const points: [number, number][] = [];
  const steps = 60;
  const domainMax = 6;

  for (let i = 0; i <= steps; i++) {
    const percent = i / steps;
    const px = xStart + percent * (xEnd - xStart);
    const t = percent * domainMax;
    const val = fn(t);
    const py = yZero - val * yMaxHeight;
    points.push([px, py]);
  }

  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(' ');
}
