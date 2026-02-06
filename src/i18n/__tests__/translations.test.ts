import { describe, expect, it } from 'vitest';
import { translations } from '../translations';

describe('translations', () => {
  it('should define the same translation keys for english and chinese', () => {
    const enKeys = Object.keys(translations.en).sort();
    const zhKeys = Object.keys(translations.zh).sort();

    expect(zhKeys).toEqual(enKeys);
  });

  it('should include required language and settings labels', () => {
    expect(translations.en['language.english']).toBe('English');
    expect(translations.en['language.chinese']).toBe('Chinese');
    expect(translations.en['settings.title']).toBe('Personal Settings');
    expect(translations.en['settings.language.title']).toBe('Language');

    expect(translations.zh['language.english']).toBeTruthy();
    expect(translations.zh['language.chinese']).toBeTruthy();
    expect(translations.zh['settings.title']).toBeTruthy();
    expect(translations.zh['settings.language.title']).toBeTruthy();
  });
});
