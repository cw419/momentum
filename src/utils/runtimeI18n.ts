import type { Language } from '../i18n';
import { localPreferences } from './localPreferences';

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
  const stored = localPreferences.getLanguage();
  if (stored) return stored;
  return detectBrowserLanguage();
};

export const tr = (zh: string, en: string, language: Language = getCurrentLanguage()): string => {
  return language === 'zh' ? zh : en;
};

