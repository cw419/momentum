import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { notificationManager } from '../utils/notifications';
import { useI18n } from '../i18n';
import { Switch } from './Switch';

export const NotificationToggle: React.FC = () => {
  const { tr } = useI18n();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = notificationManager.isSupported();
    setIsSupported(supported);

    if (supported) {
      setIsEnabled(notificationManager.isNotificationsEnabled());
    }
  }, []);

  const handleToggle = async (nextEnabled: boolean) => {
    if (!isSupported) return;

    if (!nextEnabled) {
      // 禁用通知
      notificationManager.disableNotifications();
      setIsEnabled(false);
    } else {
      // 启用通知
      const granted = await notificationManager.enableNotifications();
      setIsEnabled(granted);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2 text-gray-700 dark:text-slate-300">
        {isEnabled ? (
          <Bell size={16} className="text-blue-500" />
        ) : (
          <BellOff size={16} className="text-gray-400" />
        )}
        <span className="font-chinese text-sm">
          {tr('桌面通知', 'Desktop notifications')}
        </span>
      </div>

      <Switch
        checked={isEnabled}
        onCheckedChange={handleToggle}
        aria-label={tr('切换桌面通知', 'Toggle desktop notifications')}
      />
    </div>
  );
};
