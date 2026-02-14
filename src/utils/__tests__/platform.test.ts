import { afterEach, describe, expect, it, vi } from 'vitest';

interface LoadPlatformOptions {
  userAgent: string;
  tauriInternals?: boolean;
  tauriGlobal?: boolean;
}

const windowFlags = window as unknown as Record<string, unknown>;
const originalUserAgent = navigator.userAgent;
const originalHasTauriInternals = '__TAURI_INTERNALS__' in windowFlags;
const originalTauriInternals = windowFlags.__TAURI_INTERNALS__;
const originalHasTauriGlobal = '__TAURI__' in windowFlags;
const originalTauriGlobal = windowFlags.__TAURI__;

function restoreWindowFlags(): void {
  if (originalHasTauriInternals) {
    Object.defineProperty(windowFlags, '__TAURI_INTERNALS__', {
      configurable: true,
      value: originalTauriInternals,
      writable: true,
    });
  } else {
    delete windowFlags.__TAURI_INTERNALS__;
  }

  if (originalHasTauriGlobal) {
    Object.defineProperty(windowFlags, '__TAURI__', {
      configurable: true,
      value: originalTauriGlobal,
      writable: true,
    });
  } else {
    delete windowFlags.__TAURI__;
  }

  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: originalUserAgent,
  });
}

async function loadPlatform(options: LoadPlatformOptions) {
  const { userAgent, tauriInternals = false, tauriGlobal = false } = options;

  vi.resetModules();
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  });

  if (tauriInternals) {
    Object.defineProperty(windowFlags, '__TAURI_INTERNALS__', {
      configurable: true,
      value: {},
      writable: true,
    });
  } else {
    delete windowFlags.__TAURI_INTERNALS__;
  }

  if (tauriGlobal) {
    Object.defineProperty(windowFlags, '__TAURI__', {
      configurable: true,
      value: {},
      writable: true,
    });
  } else {
    delete windowFlags.__TAURI__;
  }

  return import('../platform');
}

describe('platform detection', () => {
  afterEach(() => {
    restoreWindowFlags();
    vi.restoreAllMocks();
  });

  it('detects tauri desktop from __TAURI_INTERNALS__', async () => {
    const platformModule = await loadPlatform({
      userAgent: 'Mozilla/5.0',
      tauriInternals: true,
    });

    expect(platformModule.platform).toBe('tauri-desktop');
    expect(platformModule.isTauriDesktop).toBe(true);
  });

  it('detects tauri desktop from __TAURI__ global', async () => {
    const platformModule = await loadPlatform({
      userAgent: 'Mozilla/5.0',
      tauriGlobal: true,
    });

    expect(platformModule.platform).toBe('tauri-desktop');
    expect(platformModule.isTauri).toBe(true);
  });

  it('detects tauri mobile from tauri runtime plus mobile user agent', async () => {
    const platformModule = await loadPlatform({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      tauriGlobal: true,
    });

    expect(platformModule.platform).toBe('tauri-mobile');
    expect(platformModule.isTauriMobile).toBe(true);
  });

  it('falls back to tauri desktop via user-agent token', async () => {
    const platformModule = await loadPlatform({
      userAgent: 'Mozilla/5.0 Tauri/2.0.0',
    });

    expect(platformModule.platform).toBe('tauri-desktop');
    expect(platformModule.isTauri).toBe(true);
  });

  it('returns web when tauri runtime signals are missing', async () => {
    const platformModule = await loadPlatform({
      userAgent: 'Mozilla/5.0',
    });

    expect(platformModule.platform).toBe('web');
    expect(platformModule.isWeb).toBe(true);
  });
});
