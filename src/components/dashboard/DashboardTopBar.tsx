import React from 'react';
import { Settings } from 'lucide-react';

import { NotificationToggle } from '../NotificationToggle';
import { ThemeToggle } from '../ThemeToggle';

interface DashboardTopBarProps {
  settingsTitle: string;
  settingsButtonText: string;
  onShowAccountModal: () => void;
}

const DashboardTopBarComponent: React.FC<DashboardTopBarProps> = ({
  settingsTitle,
  settingsButtonText,
  onShowAccountModal,
}) => (
  <div
    data-testid="dashboard-topbar"
    className="mb-6 flex items-center justify-end space-x-4"
  >
    <button
      type="button"
      onClick={onShowAccountModal}
      aria-label={settingsTitle}
      className="flex items-center space-x-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-gray-700 shadow-sm transition duration-300 hover:scale-105 hover:bg-gray-50 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      <Settings size={18} aria-hidden="true" />
      <span className="font-chinese text-sm">{settingsButtonText}</span>
    </button>
    <NotificationToggle />
    <ThemeToggle />
  </div>
);

export const DashboardTopBar = React.memo(DashboardTopBarComponent);

DashboardTopBar.displayName = 'DashboardTopBar';
