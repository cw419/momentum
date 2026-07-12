import { memo } from 'react';
import { DashboardView } from './dashboard/DashboardView';
import type { DashboardProps } from './dashboard/types';
import { useDashboardController } from './dashboard/useDashboardController';

export const Dashboard = memo((props: DashboardProps) => {
  const controller = useDashboardController(props);
  return <DashboardView {...props} {...controller} />;
});

Dashboard.displayName = 'Dashboard';
