import React from 'react';
import {
  Link,
  Layers,
  Zap,
  Search,
  Crown,
  Wrench,
  Dumbbell,
  Utensils,
} from 'lucide-react';

export type IconName = 'link' | 'layers' | 'zap' | 'search' | 'crown' | 'wrench' | 'dumbbell' | 'utensils';

const iconComponents: Record<IconName, React.ComponentType<{ size?: number; className?: string }>> = {
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

export const Icon: React.FC<IconProps> = ({ name, size = 16, className }) => {
  const IconComponent = iconComponents[name];
  if (!IconComponent) {
    return null;
  }
  return <IconComponent size={size} className={className} />;
};

export default Icon;
