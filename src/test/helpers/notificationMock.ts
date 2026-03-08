import { vi } from 'vitest';

interface MockNotificationOptions {
  initialPermission?: NotificationPermission;
  requestResult?: NotificationPermission;
}

interface NotificationMockHandle {
  instances: Array<{
    title: string;
    options: NotificationOptions;
    close: ReturnType<typeof vi.fn>;
  }>;
  requestPermissionMock: ReturnType<typeof vi.fn>;
  setPermission(permission: NotificationPermission): void;
  restore(): void;
}

function installNotificationMock(
  options: MockNotificationOptions = {},
): NotificationMockHandle {
  const { initialPermission = 'default', requestResult = 'granted' } = options;

  const originalGlobal = (globalThis as { Notification?: unknown })
    .Notification;
  const originalWindow =
    typeof window !== 'undefined'
      ? (window as Window & { Notification?: unknown }).Notification
      : undefined;

  const instances: NotificationMockHandle['instances'] = [];
  const requestPermissionMock = vi.fn(async () => requestResult);

  class MockNotification {
    static permission: NotificationPermission = initialPermission;
    static requestPermission = requestPermissionMock;
    onclick: (() => void) | null = null;
    close = vi.fn();

    constructor(
      public title: string,
      public options: NotificationOptions = {},
    ) {
      instances.push({
        title,
        options,
        close: this.close,
      });
    }
  }

  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    writable: true,
    value: MockNotification,
  });

  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: MockNotification,
    });
  }

  return {
    instances,
    requestPermissionMock,
    setPermission(permission) {
      MockNotification.permission = permission;
    },
    restore() {
      if (originalGlobal === undefined) {
        delete (globalThis as { Notification?: unknown }).Notification;
      } else {
        Object.defineProperty(globalThis, 'Notification', {
          configurable: true,
          writable: true,
          value: originalGlobal,
        });
      }

      if (typeof window !== 'undefined') {
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
