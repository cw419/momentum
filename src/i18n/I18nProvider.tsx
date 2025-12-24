import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations, type Language } from './translations';

const LANGUAGE_STORAGE_KEY = 'language';

type TranslationParams = Record<string, string | number | boolean | null | undefined>;

interface I18nContextValue {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: TranslationParams) => string;
  tr: (zh: string, en: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const detectBrowserLanguage = (): Language => {
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

const getLocale = (language: Language): string => {
  return language === 'zh' ? 'zh-CN' : 'en-US';
};

const interpolate = (template: string, params?: TranslationParams): string => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key];
    if (value === null || value === undefined) return '';
    return String(value);
  });
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof localStorage === 'undefined') return detectBrowserLanguage();

    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
    return detectBrowserLanguage();
  });

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const locale = useMemo(() => getLocale(language), [language]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: string, params?: TranslationParams) => {
      const dict = translations[language];
      const fallbackDict = translations.en;
      const template = dict[key] ?? fallbackDict[key] ?? key;
      return interpolate(template, params);
    },
    [language]
  );

  const tr = useCallback(
    (zh: string, en: string) => {
      return language === 'zh' ? zh : en;
    },
    [language]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      locale,
      setLanguage,
      t,
      tr,
    }),
    [language, locale, setLanguage, t, tr]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
