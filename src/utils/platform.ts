export type Platform = 'web' | 'tauri-desktop' | 'tauri-mobile';

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'web';

  const hasTauri = '__TAURI_INTERNALS__' in window;
  if (!hasTauri) return 'web';

  const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isMobileUA ? 'tauri-mobile' : 'tauri-desktop';
}

export const platform: Platform = detectPlatform();
export const isTauri = platform !== 'web';
export const isTauriDesktop = platform === 'tauri-desktop';
export const isTauriMobile = platform === 'tauri-mobile';
export const isWeb = platform === 'web';
