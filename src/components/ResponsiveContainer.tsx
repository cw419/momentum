import type { ReactNode } from 'react';

interface ResponsiveContainerProps {
  children: ReactNode;
  maxWidth?: '2xl' | '4xl';
  padding?: 'responsive' | 'fixed';
  className?: string;
}

const MAX_WIDTH_CLASSES = {
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
} as const;

export function ResponsiveContainer({
  children,
  maxWidth = '2xl',
  padding = 'responsive',
  className = '',
}: ResponsiveContainerProps) {
  const paddingClass =
    padding === 'responsive' ? 'px-4 sm:px-6 lg:px-8' : 'px-4';

  const baseClasses = [
    'mx-auto w-full',
    MAX_WIDTH_CLASSES[maxWidth],
    paddingClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={baseClasses}>{children}</div>;
}
