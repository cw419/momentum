import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> & {
  label: string;
  children: ReactNode;
};

export function IconButton({
  label,
  className,
  type = 'button',
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`focus-ring inline-flex items-center justify-center ${className ?? ''}`}
      {...props}
    >
      {children}
    </button>
  );
}
