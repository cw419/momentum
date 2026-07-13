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
    className="mb-8 flex items-center justify-end gap-2"
  >
    <button
      type="button"
      onClick={onShowAccountModal}
      aria-label={settingsTitle}
      className="focus-ring flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-gray-700 transition-colors hover:border-gray-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
    >
      <Settings size={18} aria-hidden="true" />
      <span className="hidden font-chinese text-sm sm:inline">
        {settingsButtonText}
      </span>
    </button>
    <NotificationToggle placement="topbar" />
    <ThemeToggle />
  </div>
);

export const DashboardTopBar = React.memo(DashboardTopBarComponent);

DashboardTopBar.displayName = 'DashboardTopBar';
