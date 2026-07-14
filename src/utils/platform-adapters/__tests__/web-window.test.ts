import { afterEach, describe, expect, it, vi } from 'vitest';
import { webWindowAdapter } from '../web-window';

const root = document.documentElement;
const originalRequestFullscreen = Object.getOwnPropertyDescriptor(
  root,
  'requestFullscreen',
);
const originalFullscreenElement = Object.getOwnPropertyDescriptor(
  document,
  'fullscreenElement',
);
const originalExitFullscreen = Object.getOwnPropertyDescriptor(
  document,
  'exitFullscreen',
);

function restoreProperty(
  target: object,
  name: string,
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(target, name, descriptor);
  } else {
    delete (target as Record<string, unknown>)[name];
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  restoreProperty(root, 'requestFullscreen', originalRequestFullscreen);
  restoreProperty(document, 'fullscreenElement', originalFullscreenElement);
  restoreProperty(document, 'exitFullscreen', originalExitFullscreen);
  vi.restoreAllMocks();
});

describe('webWindowAdapter', () => {
  it('reports the browser window capabilities that actually exist', () => {
    Object.defineProperty(root, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(),
    });

    expect(webWindowAdapter.getCapabilities()).toEqual({
      canSetFullscreen: true,
      canMinimizeToTray: false,
      canFocus: true,
    });
  });

  it('reports no browser capabilities during server-side rendering', () => {
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('window', undefined);

    expect(webWindowAdapter.getCapabilities()).toEqual({
      canSetFullscreen: false,
      canMinimizeToTray: false,
      canFocus: false,
    });
  });

  it('enters fullscreen through the document root', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(root, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });

    await webWindowAdapter.setFullscreen(true);

    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  it('exits fullscreen only while an element owns fullscreen', async () => {
    const exitFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: root,
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    });

    await webWindowAdapter.setFullscreen(false);

    expect(exitFullscreen).toHaveBeenCalledOnce();
  });

  it('does not call the exit API when the page is not fullscreen', async () => {
    const exitFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    });

    await webWindowAdapter.setFullscreen(false);

    expect(exitFullscreen).not.toHaveBeenCalled();
  });

  it('delegates focus to the browser window', async () => {
    const focus = vi.spyOn(window, 'focus').mockImplementation(() => undefined);

    await webWindowAdapter.focus();

    expect(focus).toHaveBeenCalledOnce();
  });
});
