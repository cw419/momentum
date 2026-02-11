import React from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useI18n } from '../i18n';
import { Switch } from './Switch';
import { useSystemNotificationState } from '../hooks/useSystemNotificationState';
import { systemNotificationService } from '../services/platform/SystemNotificationService';

interface NotificationToggleProps {
  placement: 'topbar' | 'settings';
}

export const NotificationToggle: React.FC<NotificationToggleProps> = ({
  placement,
}) => {
  const { tr } = useI18n();
  const notificationState = useSystemNotificationState();

  if (
    !notificationState.supported ||
    notificationState.togglePlacement !== placement
  ) {
    return null;
  }

  const handleToggle = async (nextEnabled: boolean) => {
    if (!nextEnabled) {
      systemNotificationService.disable();
      return;
    }
    await systemNotificationService.enable();
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2 text-gray-700 dark:text-slate-300">
        {notificationState.enabled ? (
          <Bell size={16} className="text-blue-500" />
        ) : (
          <BellOff size={16} className="text-gray-400" />
        )}
        <span className="font-chinese text-sm">
          {tr('系统通知', 'System notifications')}
        </span>
      </div>

      <Switch
        checked={notificationState.enabled}
        onCheckedChange={handleToggle}
        aria-label={tr('切换系统通知', 'Toggle system notifications')}
      />
    </div>
  );
};

