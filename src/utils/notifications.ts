/**
 * Desktop notification utilities.
 */

import type { Language } from '../i18n';
import { logger } from './logger';
import { localPreferences } from './localPreferences';
import { randomId } from './random';
import { getCurrentLanguage, tr } from './runtimeI18n';

const DEFAULT_NOTIFICATION_ICON = '/icons/icon-192.png';

const formatChainWithReason = (language: Language, chainName: string, reason?: string) => {
  const quotedChainName = `"${chainName}"`;
  if (!reason) return quotedChainName;
  return language === 'zh' ? `${quotedChainName}：${reason}` : `${quotedChainName}: ${reason}`;
};

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

class NotificationManager {
  private permission: NotificationPermission = 'default';
  private isEnabled = false;

  constructor() {
    this.checkPermission();
    this.loadEnabledState();
  }

  async notifyTaskFailed(chainName: string, reason: string) {
    if (!this.isNotificationsEnabled()) return null;

    const language = getCurrentLanguage();
    return this.showNotification({
      title: tr('任务失败', 'Task failed', language),
      body: formatChainWithReason(language, chainName, reason),
      icon: DEFAULT_NOTIFICATION_ICON,
      tag: randomId('task-failed'),
      requireInteraction: true,
    });
  }

  async notifyTaskCompleted(chainName: string, streak: number, message?: string) {
    if (!this.isNotificationsEnabled()) return null;

    const language = getCurrentLanguage();
    const messageSuffix = message ? ` ${message}` : '';

    return this.showNotification({
      title: tr('任务完成', 'Task completed', language),
      body:
        language === 'zh'
          ? `"${chainName}"已完成！${messageSuffix}当前记录: #${streak}`
          : `"${chainName}" completed!${messageSuffix}Current streak: #${streak}`,
      icon: DEFAULT_NOTIFICATION_ICON,
      tag: randomId('task-completed'),
      requireInteraction: false,
    });
  }

  async notifyTaskWarning(chainName: string, timeRemaining: string) {
    if (!this.isNotificationsEnabled()) return null;

    const language = getCurrentLanguage();
    return this.showNotification({
      title: tr('任务即将结束', 'Task ending soon', language),
      body:
        language === 'zh'
          ? `"${chainName}"还剩${timeRemaining}，请继续保持专注！`
          : `"${chainName}" has ${timeRemaining} left. Stay focused!`,
      icon: DEFAULT_NOTIFICATION_ICON,
      tag: randomId('task-warning'),
      requireInteraction: false,
    });
  }

  async notifyScheduleWarning(chainName: string, timeRemaining: string) {
    if (!this.isNotificationsEnabled()) return null;

    const language = getCurrentLanguage();
    return this.showNotification({
      title: tr('预约即将到期', 'Schedule expiring', language),
      body:
        language === 'zh'
          ? `"${chainName}"预约还剩${timeRemaining}，请准备开始任务！`
          : `"${chainName}" schedule has ${timeRemaining} left. Get ready to start!`,
      icon: DEFAULT_NOTIFICATION_ICON,
      tag: randomId('schedule-warning'),
      requireInteraction: true,
    });
  }

  async notifyScheduleFailed(chainName: string) {
    if (!this.isNotificationsEnabled()) return null;

    const language = getCurrentLanguage();
    return this.showNotification({
      title: tr('预约失败', 'Schedule failed', language),
      body:
        language === 'zh'
          ? `"${chainName}"预约时间已到期，需要进行规则判定。`
          : `"${chainName}" schedule expired. Adjudication required.`,
      icon: DEFAULT_NOTIFICATION_ICON,
      tag: randomId('schedule-failed'),
      requireInteraction: true,
    });
  }

  private checkPermission() {
    if (typeof window === 'undefined') return;
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  private loadEnabledState() {
    const stored = localPreferences.getNotificationsEnabled();
    this.isEnabled = stored === true && this.permission === 'granted';
  }

  private saveEnabledState() {
    localPreferences.setNotificationsEnabled(this.isEnabled);
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      logger.warn('NOTIFICATIONS', 'Desktop notifications are not supported in this environment');
      return false;
    }

    if (this.permission === 'granted') {
      this.isEnabled = true;
      this.saveEnabledState();
      return true;
    }

    if (this.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      this.isEnabled = permission === 'granted';
      this.saveEnabledState();
      return permission === 'granted';
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('NOTIFICATIONS', 'Failed to request notification permission', undefined, err);
      return false;
    }
  }

  async enableNotifications(): Promise<boolean> {
    const hasPermission = await this.requestPermission();
    if (hasPermission) {
      this.isEnabled = true;
      this.saveEnabledState();
    }
    return hasPermission;
  }

  disableNotifications(): void {
    this.isEnabled = false;
    this.saveEnabledState();
  }

  isNotificationsEnabled(): boolean {
    return this.isEnabled && this.permission === 'granted';
  }

  async showNotification(options: NotificationOptions): Promise<Notification | null> {
    if (!this.isNotificationsEnabled()) return null;

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || DEFAULT_NOTIFICATION_ICON,
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      if (!options.requireInteraction) {
        window.setTimeout(() => notification.close(), 5000);
      }

      return notification;
    } catch {
      return null;
    }
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window;
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }
}

export const notificationManager = new NotificationManager();
