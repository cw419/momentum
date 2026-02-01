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
  <div data-testid="dashboard-topbar" className="flex justify-end items-center space-x-4 mb-6">
    <button
      type="button"
      onClick={onShowAccountModal}
      aria-label={settingsTitle}
      className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-2xl border border-gray-200 dark:border-slate-600 shadow-sm hover:shadow-md transition duration-300 hover:scale-105"
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

