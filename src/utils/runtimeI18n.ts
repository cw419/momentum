import type { Language } from '../i18n';

const LANGUAGE_STORAGE_KEY = 'language';

export const detectBrowserLanguage = (): Language => {
  if (typeof navigator === 'undefined') return 'en';

  const candidates = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    if (candidate.toLowerCase().startsWith('zh')) return 'zh';
  }

  return 'en';
};

export const getCurrentLanguage = (): Language => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
  } catch {
    // ignore
  }

  return detectBrowserLanguage();
};

export const tr = (zh: string, en: string, language: Language = getCurrentLanguage()): string => {
  return language === 'zh' ? zh : en;
};

