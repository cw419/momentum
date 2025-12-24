import type { Language } from '../i18n';

const CHINESE_CHAR_REGEX = /[\u4e00-\u9fff]/;

export function containsChinese(text: string): boolean {
  return CHINESE_CHAR_REGEX.test(text);
}

/**
 * Returns an error detail string only when it's likely written in the current UI language,
 * to avoid mixed-language UI. Otherwise returns null.
 */
export function getSafeErrorDetail(errorMessage: string, language: Language): string | null {
  const hasChinese = containsChinese(errorMessage);
  if (language === 'zh') return hasChinese ? errorMessage : null;
  return hasChinese ? null : errorMessage;
}

