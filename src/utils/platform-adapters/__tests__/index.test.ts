import { afterEach, describe, expect, it, vi } from 'vitest';

describe('platform adapter selection', () => {
  afterEach(() => {
    vi.doUnmock('../../platform');
    vi.resetModules();
  });

  it('selects and caches each Tauri adapter for a mobile runtime', async () => {
    vi.resetModules();
    vi.doMock('../../platform', () => ({
      isTauri: true,
      isTauriMobile: true,
    }));

    const adapters = await import('../index');
    const [tauri, tauriWindow, tauriFile, tauriHaptics] = await Promise.all([
      import('../tauri'),
      import('../tauri-window'),
      import('../tauri-file'),
      import('../tauri-haptics'),
    ]);

    const notification = await adapters.getNotificationAdapter();
    const windowAdapter = await adapters.getWindowAdapter();
    const file = await adapters.getFileAdapter();
    const haptics = await adapters.getHapticsAdapter();

    expect(notification).toBe(tauri.tauriNotificationAdapter);
    expect(windowAdapter).toBe(tauriWindow.tauriWindowAdapter);
    expect(file).toBe(tauriFile.tauriFileAdapter);
    expect(haptics).toBe(tauriHaptics.tauriHapticsAdapter);
    expect(await adapters.getNotificationAdapter()).toBe(notification);
    expect(await adapters.getWindowAdapter()).toBe(windowAdapter);
    expect(await adapters.getFileAdapter()).toBe(file);
    expect(await adapters.getHapticsAdapter()).toBe(haptics);
  });
});
