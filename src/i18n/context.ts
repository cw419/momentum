import { createContext } from 'react';
import type { Language } from './translations';

export type TranslationParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface I18nContextValue {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: TranslationParams) => string;
  tr: (zh: string, en: string) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
