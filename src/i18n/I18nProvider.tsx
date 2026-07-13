import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  translations,
  type Language,
  type TranslationKey,
} from './translations';
import {
  I18nContext,
  type I18nContextValue,
  type TranslationParams,
} from './context';
import { localPreferences } from '../utils/localPreferences';

const HAN_CHARACTER_REGEX = /[\u4E00-\u9FFF]/;

const WIN1252_CODEPOINT_TO_BYTE = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
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
    return new TextDecoder('utf-8', { fatal: true }).decode(
      new Uint8Array(bytes),
    );
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

const detectBrowserLanguage = (): Language => {
  if (typeof navigator === 'undefined') return 'en';

  const browserLanguages: readonly string[] = Array.isArray(navigator.languages)
    ? navigator.languages
    : [];
  const candidates: readonly string[] =
    browserLanguages.length > 0 ? browserLanguages : [navigator.language];

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

    const stored = localPreferences.getLanguage();
    if (stored) return stored;
    return detectBrowserLanguage();
  });

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    localPreferences.setLanguage(next);
  }, []);

  const locale = useMemo(() => getLocale(language), [language]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => {
      const dict = translations[language];
      const fallbackDict = translations.en;
      const template = dict[key] ?? fallbackDict[key] ?? key;
      return interpolate(template, params);
    },
    [language],
  );

  const tr = useCallback(
    (zh: string, en: string) => {
      if (language !== 'zh') return en;
      return normalizeZhInlineTranslation(zh);
    },
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      locale,
      setLanguage,
      t,
      tr,
    }),
    [language, locale, setLanguage, t, tr],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
