import { afterEach, describe, expect, it, vi } from 'vitest';

type PermissionState = 'default' | 'granted' | 'denied';

interface LoadAdapterOptions {
  isTauriMobile: boolean;
  permissionGranted?: boolean;
  requestPermissionResult?: PermissionState;
}

async function loadAdapter(options: LoadAdapterOptions) {
  const {
    isTauriMobile,
    permissionGranted = false,
    requestPermissionResult = 'default',
  } = options;

  vi.resetModules();

  const invokeCommand = vi.fn(async () => undefined);
  const isPermissionGranted = vi.fn(async () => permissionGranted);
  const requestPermission = vi.fn(async () => requestPermissionResult);

  vi.doMock('../../platform', () => ({
    isTauriMobile,
  }));
  vi.doMock('../../tauri-bridge', () => ({
    invokeCommand,
  }));
  vi.doMock('@tauri-apps/plugin-notification', () => ({
    isPermissionGranted,
    requestPermission,
  }));

  const module = await import('../tauri');
  return {
    adapter: module.tauriNotificationAdapter,
    invokeCommand,
    isPermissionGranted,
    requestPermission,
  };
}

describe('tauri notification adapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('treats desktop permission state as granted', async () => {
    const loaded = await loadAdapter({
      isTauriMobile: false,
      permissionGranted: false,
    });

    await expect(loaded.adapter.getPermissionState()).resolves.toBe('granted');
    await expect(loaded.adapter.requestPermission()).resolves.toBe('granted');
    expect(loaded.isPermissionGranted).not.toHaveBeenCalled();
    expect(loaded.requestPermission).not.toHaveBeenCalled();
  });

  it('uses plugin permission checks on tauri mobile', async () => {
    const loaded = await loadAdapter({
      isTauriMobile: true,
      permissionGranted: false,
      requestPermissionResult: 'denied',
    });

    await expect(loaded.adapter.getPermissionState()).resolves.toBe('default');
    await expect(loaded.adapter.requestPermission()).resolves.toBe('denied');
    expect(loaded.isPermissionGranted).toHaveBeenCalledTimes(2);
    expect(loaded.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('sends notifications through tauri command bridge', async () => {
    const loaded = await loadAdapter({
      isTauriMobile: false,
    });

    await loaded.adapter.show({
      title: 'Task completed',
      body: 'All done',
    });

    expect(loaded.invokeCommand).toHaveBeenCalledWith('send_notification', {
      title: 'Task completed',
      body: 'All done',
    });
  });
});
