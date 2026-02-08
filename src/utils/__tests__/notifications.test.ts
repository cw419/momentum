import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationMockHandle } from '../../test/helpers/notificationMock';
import { installNotificationMock } from '../../test/helpers/notificationMock';

interface LoadOptions {
  supported?: boolean;
  storedEnabled?: boolean | null;
  initialPermission?: NotificationPermission;
  requestResult?: NotificationPermission;
  language?: 'en' | 'zh';
}

interface LoadedModule {
  notificationManager: {
    notifyTaskFailed(
      chainName: string,
      reason: string,
    ): Promise<Notification | null>;
    notifyTaskCompleted(
      chainName: string,
      streak: number,
      message?: string,
    ): Promise<Notification | null>;
    notifyTaskWarning(
      chainName: string,
      timeRemaining: string,
    ): Promise<Notification | null>;
    notifyScheduleWarning(
      chainName: string,
      timeRemaining: string,
    ): Promise<Notification | null>;
    notifyScheduleFailed(chainName: string): Promise<Notification | null>;
    requestPermission(): Promise<boolean>;
    enableNotifications(): Promise<boolean>;
    disableNotifications(): void;
    isNotificationsEnabled(): boolean;
    showNotification(options: {
      title: string;
      body: string;
      icon?: string;
      tag?: string;
      requireInteraction?: boolean;
      silent?: boolean;
    }): Promise<Notification | null>;
    isSupported(): boolean;
    getPermission(): NotificationPermission;
  };
  loggerMock: {
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };
  localPreferencesMock: {
    getNotificationsEnabled: ReturnType<typeof vi.fn>;
    setNotificationsEnabled: ReturnType<typeof vi.fn>;
  };
  notificationMock: NotificationMockHandle | null;
  restore(): void;
}

async function loadNotificationModule(
  options: LoadOptions = {},
): Promise<LoadedModule> {
  const {
    supported = true,
    storedEnabled = false,
    initialPermission = 'default',
    requestResult = 'granted',
    language = 'en',
  } = options;

  vi.resetModules();

  const loggerMock = {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };
  const localPreferencesMock = {
    getNotificationsEnabled: vi.fn(() => storedEnabled),
    setNotificationsEnabled: vi.fn(),
  };

  vi.doMock('../logger', () => ({ logger: loggerMock }));
  vi.doMock('../localPreferences', () => ({
    localPreferences: localPreferencesMock,
  }));
  vi.doMock('../runtimeI18n', () => ({
    getCurrentLanguage: vi.fn(() => language),
    tr: (zh: string, en: string, language: 'zh' | 'en' = 'en') =>
      language === 'zh' ? zh : en,
  }));
  vi.doMock('../random', () => ({
    randomId: vi.fn((prefix: string) => `${prefix}-test-id`),
  }));

  const originalGlobal = (globalThis as { Notification?: unknown })
    .Notification;
  const originalWindow = (window as Window & { Notification?: unknown })
    .Notification;

  let notificationMock: NotificationMockHandle | null = null;

  if (supported) {
    notificationMock = installNotificationMock({
      initialPermission,
      requestResult,
    });
  } else {
    delete (globalThis as { Notification?: unknown }).Notification;
    delete (window as Window & { Notification?: unknown }).Notification;
  }

  const { notificationManager } = await import('../notifications');

  return {
    notificationManager,
    loggerMock,
    localPreferencesMock,
    notificationMock,
    restore() {
      notificationMock?.restore();

      if (!supported) {
        if (originalGlobal === undefined) {
          delete (globalThis as { Notification?: unknown }).Notification;
        } else {
          Object.defineProperty(globalThis, 'Notification', {
            configurable: true,
            writable: true,
            value: originalGlobal,
          });
        }

        if (originalWindow === undefined) {
          delete (window as Window & { Notification?: unknown }).Notification;
        } else {
          Object.defineProperty(window, 'Notification', {
            configurable: true,
            writable: true,
            value: originalWindow,
          });
        }
      }
    },
  };
}

describe('notifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false and logs warning when notifications are unsupported', async () => {
    const loaded = await loadNotificationModule({ supported: false });
    try {
      const result = await loaded.notificationManager.requestPermission();
      expect(result).toBe(false);
      expect(loaded.loggerMock.warn).toHaveBeenCalled();
    } finally {
      loaded.restore();
    }
  });

  it('requestPermission handles granted / denied / default flows', async () => {
    const granted = await loadNotificationModule({
      supported: true,
      initialPermission: 'granted',
      storedEnabled: false,
    });
    try {
      await expect(
        granted.notificationManager.requestPermission(),
      ).resolves.toBe(true);
      expect(
        granted.localPreferencesMock.setNotificationsEnabled,
      ).toHaveBeenCalledWith(true);
    } finally {
      granted.restore();
    }

    const denied = await loadNotificationModule({
      supported: true,
      initialPermission: 'denied',
    });
    try {
      await expect(
        denied.notificationManager.requestPermission(),
      ).resolves.toBe(false);
      expect(
        denied.localPreferencesMock.setNotificationsEnabled,
      ).not.toHaveBeenCalled();
    } finally {
      denied.restore();
    }

    const defaultFlow = await loadNotificationModule({
      supported: true,
      initialPermission: 'default',
      requestResult: 'granted',
    });
    try {
      await expect(
        defaultFlow.notificationManager.requestPermission(),
      ).resolves.toBe(true);
      expect(
        defaultFlow.notificationMock?.requestPermissionMock,
      ).toHaveBeenCalledTimes(1);
      expect(
        defaultFlow.localPreferencesMock.setNotificationsEnabled,
      ).toHaveBeenCalledWith(true);
    } finally {
      defaultFlow.restore();
    }

    const defaultDeniedFlow = await loadNotificationModule({
      supported: true,
      initialPermission: 'default',
      requestResult: 'denied',
    });
    try {
      await expect(
        defaultDeniedFlow.notificationManager.requestPermission(),
      ).resolves.toBe(false);
      expect(
        defaultDeniedFlow.notificationMock?.requestPermissionMock,
      ).toHaveBeenCalledTimes(1);
      expect(
        defaultDeniedFlow.localPreferencesMock.setNotificationsEnabled,
      ).toHaveBeenCalledWith(false);
    } finally {
      defaultDeniedFlow.restore();
    }
  });

  it('handles requestPermission exceptions and returns false', async () => {
    const loaded = await loadNotificationModule({
      supported: true,
      initialPermission: 'default',
    });
    try {
      loaded.notificationMock?.requestPermissionMock.mockRejectedValueOnce(
        new Error('permission error'),
      );
      await expect(
        loaded.notificationManager.requestPermission(),
      ).resolves.toBe(false);
      expect(loaded.loggerMock.error).toHaveBeenCalled();
    } finally {
      loaded.restore();
    }
  });

  it('enableNotifications and disableNotifications persist enabled state', async () => {
    const loaded = await loadNotificationModule({
      supported: true,
      initialPermission: 'default',
      requestResult: 'granted',
    });
    try {
      await expect(
        loaded.notificationManager.enableNotifications(),
      ).resolves.toBe(true);
      expect(loaded.notificationManager.isNotificationsEnabled()).toBe(true);

      loaded.notificationManager.disableNotifications();
      expect(loaded.notificationManager.isNotificationsEnabled()).toBe(false);
      expect(
        loaded.localPreferencesMock.setNotificationsEnabled,
      ).toHaveBeenLastCalledWith(false);
    } finally {
      loaded.restore();
    }
  });

  it('showNotification supports onclick side effects and auto-close behavior', async () => {
    const loaded = await loadNotificationModule({
      supported: true,
      storedEnabled: true,
      initialPermission: 'granted',
    });
    try {
      const focusSpy = vi
        .spyOn(window, 'focus')
        .mockImplementation(() => undefined);

      const notification = await loaded.notificationManager.showNotification({
        title: 'Task complete',
        body: 'Great job',
      });

      expect(notification).not.toBeNull();
      expect(loaded.notificationMock?.instances).toHaveLength(1);

      if (notification) {
        const casted = notification as Notification & {
          close: ReturnType<typeof vi.fn>;
        };
        notification.onclick?.(new Event('click'));
        expect(focusSpy).toHaveBeenCalled();
        expect(casted.close).toHaveBeenCalledTimes(1);
      }

      const autoCloseNotification =
        await loaded.notificationManager.showNotification({
          title: 'Reminder',
          body: 'Auto close',
        });

      expect(autoCloseNotification).not.toBeNull();
      if (autoCloseNotification) {
        const casted = autoCloseNotification as Notification & {
          close: ReturnType<typeof vi.fn>;
        };
        expect(casted.close).toHaveBeenCalledTimes(0);
        vi.advanceTimersByTime(5000);
        expect(casted.close).toHaveBeenCalledTimes(1);
      }
    } finally {
      loaded.restore();
    }
  });

  it('does not auto-close when requireInteraction is true', async () => {
    const loaded = await loadNotificationModule({
      supported: true,
      storedEnabled: true,
      initialPermission: 'granted',
    });
    try {
      const notification = await loaded.notificationManager.showNotification({
        title: 'Needs action',
        body: 'Keep open',
        requireInteraction: true,
      });

      expect(notification).not.toBeNull();
      if (notification) {
        const casted = notification as Notification & {
          close: ReturnType<typeof vi.fn>;
        };
        vi.advanceTimersByTime(6000);
        expect(casted.close).toHaveBeenCalledTimes(0);
      }
    } finally {
      loaded.restore();
    }
  });

  it('returns null when trying to show notification while disabled', async () => {
    const loaded = await loadNotificationModule({
      supported: true,
      storedEnabled: false,
      initialPermission: 'granted',
    });
    try {
      const notification = await loaded.notificationManager.showNotification({
        title: 'Disabled',
        body: 'Should not show',
      });
      expect(notification).toBeNull();
    } finally {
      loaded.restore();
    }
  });

  it('returns null when notification constructor throws', async () => {
    const loaded = await loadNotificationModule({
      supported: true,
      storedEnabled: true,
      initialPermission: 'granted',
    });
    try {
      class ThrowingNotification {
        static permission: NotificationPermission = 'granted';
        static requestPermission = vi.fn(async () => 'granted');
        onclick: ((event: Event) => void) | null = null;

        constructor() {
          throw new Error('constructor failed');
        }
      }
      Object.defineProperty(globalThis, 'Notification', {
        configurable: true,
        writable: true,
        value: ThrowingNotification,
      });
      Object.defineProperty(window, 'Notification', {
        configurable: true,
        writable: true,
        value: ThrowingNotification,
      });

      await expect(
        loaded.notificationManager.showNotification({
          title: 'Title',
          body: 'Body',
        }),
      ).resolves.toBeNull();
    } finally {
      loaded.restore();
    }
  });

  it('notifyTask* emits notifications with localized payloads', async () => {
    const english = await loadNotificationModule({
      supported: true,
      storedEnabled: true,
      initialPermission: 'granted',
      language: 'en',
    });
    try {
      await expect(
        english.notificationManager.notifyTaskFailed('Alpha', 'timeout'),
      ).resolves.not.toBeNull();
      await expect(
        english.notificationManager.notifyTaskCompleted('Beta', 12),
      ).resolves.not.toBeNull();
      await expect(
        english.notificationManager.notifyTaskCompleted(
          'Gamma',
          7,
          'Keep going!',
        ),
      ).resolves.not.toBeNull();
      await expect(
        english.notificationManager.notifyTaskWarning('Delta', '3m'),
      ).resolves.not.toBeNull();
      await expect(
        english.notificationManager.notifyScheduleWarning('Epsilon', '9m'),
      ).resolves.not.toBeNull();
      await expect(
        english.notificationManager.notifyScheduleFailed('Zeta'),
      ).resolves.not.toBeNull();

      const created = english.notificationMock?.instances ?? [];
      expect(created).toHaveLength(6);
      expect(created[0]?.title).toBe('Task failed');
      expect(created[0]?.options.body).toContain('"Alpha"');
      expect(created[0]?.options.body).toContain('timeout');
      expect(created[1]?.options.body).toContain('Current streak: #12');
      expect(created[2]?.options.body).toContain('Keep going!');
      expect(created[3]?.options.body).toContain('3m');
      expect(created[4]?.options.body).toContain('9m');
      expect(created[5]?.title).toBe('Schedule failed');
    } finally {
      english.restore();
    }

    const chinese = await loadNotificationModule({
      supported: true,
      storedEnabled: true,
      initialPermission: 'granted',
      language: 'zh',
    });
    try {
      await expect(
        chinese.notificationManager.notifyTaskFailed('任务A', '原因'),
      ).resolves.not.toBeNull();
      await expect(
        chinese.notificationManager.notifyTaskCompleted('任务B', 2),
      ).resolves.not.toBeNull();

      const created = chinese.notificationMock?.instances ?? [];
      expect(created).toHaveLength(2);
      expect(created[0]?.title).not.toBe('Task failed');
      expect(created[1]?.title).not.toBe('Task completed');
      expect(created[0]?.title).toContain('任务');
      expect(created[1]?.title).toContain('任务');
      expect(created[1]?.options.body).toContain('#2');
    } finally {
      chinese.restore();
    }
  });

  it('reports support and current permission correctly', async () => {
    const supported = await loadNotificationModule({
      supported: true,
      initialPermission: 'granted',
    });
    try {
      expect(supported.notificationManager.isSupported()).toBe(true);
      expect(supported.notificationManager.getPermission()).toBe('granted');
    } finally {
      supported.restore();
    }

    const unsupported = await loadNotificationModule({ supported: false });
    try {
      expect(unsupported.notificationManager.isSupported()).toBe(false);
      expect(unsupported.notificationManager.getPermission()).toBe('default');
    } finally {
      unsupported.restore();
    }
  });
});
