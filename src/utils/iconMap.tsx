import type { LucideIcon } from 'lucide-react';
import { Link, Layers, Zap, Search, Crown, Wrench, Dumbbell, Utensils } from 'lucide-react';

export type IconName = 'link' | 'layers' | 'zap' | 'search' | 'crown' | 'wrench' | 'dumbbell' | 'utensils';

const iconComponents: Record<IconName, LucideIcon> = {
  link: Link,
  layers: Layers,
  zap: Zap,
  search: Search,
  crown: Crown,
  wrench: Wrench,
  dumbbell: Dumbbell,
  utensils: Utensils,
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 16, className }: IconProps) {
  const IconComponent = iconComponents[name];
  if (!IconComponent) {
    return null;
  }
  return <IconComponent size={size} className={className} />;
}
