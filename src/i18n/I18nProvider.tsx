import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations, type Language } from './translations';

const LANGUAGE_STORAGE_KEY = 'language';
const HAN_CHARACTER_REGEX = /[\u4E00-\u9FFF]/;

const WIN1252_CODEPOINT_TO_BYTE = new Map<number, number>([
  [0x20AC, 0x80],
  [0x201A, 0x82],
  [0x0192, 0x83],
  [0x201E, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02C6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8A],
  [0x2039, 0x8B],
  [0x0152, 0x8C],
  [0x017D, 0x8E],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201C, 0x93],
  [0x201D, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02DC, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9A],
  [0x203A, 0x9B],
  [0x0153, 0x9C],
  [0x017E, 0x9E],
  [0x0178, 0x9F],
]);

const decodeUtf8FromWin1252 = (input: string): string | null => {
  if (typeof TextDecoder === 'undefined') return null;

  const bytes: number[] = [];
  for (const char of input) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;
    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    const mapped = WIN1252_CODEPOINT_TO_BYTE.get(codePoint);
    if (mapped === undefined) return null;
    bytes.push(mapped);
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
  } catch {
    return null;
  }
};

const normalizeZhInlineTranslation = (zh: string): string => {
  if (HAN_CHARACTER_REGEX.test(zh)) return zh;
  const decoded = decodeUtf8FromWin1252(zh);
  if (!decoded || !HAN_CHARACTER_REGEX.test(decoded)) return zh;
  return decoded;
};

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
      if (language !== 'zh') return en;
      return normalizeZhInlineTranslation(zh);
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
