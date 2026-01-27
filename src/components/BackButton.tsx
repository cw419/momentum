import { ArrowLeft } from 'lucide-react';
import type { ComponentProps } from 'react';
import { IconButton } from './IconButton';

type BackButtonProps = Omit<ComponentProps<typeof IconButton>, 'children'> & {
  iconSize?: number;
};

export function BackButton({ iconSize = 24, ...props }: BackButtonProps) {
  return (
    <IconButton {...props}>
      <ArrowLeft size={iconSize} aria-hidden="true" />
    </IconButton>
  );
}

