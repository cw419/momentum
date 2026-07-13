import { createContext } from 'react';
import type { Language, TranslationKey } from './translations';

export type TranslationParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface I18nContextValue {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  /** @deprecated Add a semantic translation key and use t(). */
  tr: (zh: string, en: string) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
