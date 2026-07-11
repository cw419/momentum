import type { RSIPInsightsLocale } from './rsipInsightsTypes';

export function toLocale(locale?: string): RSIPInsightsLocale {
  if (typeof locale === 'string' && locale.toLowerCase().startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

export function localize(
  locale: RSIPInsightsLocale,
  zh: string,
  en: string,
): string {
  return locale === 'zh' ? zh : en;
}

export function joinList(values: string[], locale: RSIPInsightsLocale): string {
  return values.join(locale === 'zh' ? '、' : ', ');
}
