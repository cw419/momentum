export type Language = 'en' | 'zh';

const enTranslations = {
  'language.english': 'English',
  'language.chinese': 'Chinese',

  'settings.title': 'Personal Settings',
  'settings.button': 'Settings',
  'settings.language.title': 'Language',
  'settings.language.description': 'Choose the display language',
  'dashboard.hero.nextStep': 'Choose a chain and begin',
} as const;

export type TranslationKey = keyof typeof enTranslations;

const zhTranslations = {
  'language.english': '英文',
  'language.chinese': '中文',

  'settings.title': '个人设置',
  'settings.button': '设置',
  'settings.language.title': '语言',
  'settings.language.description': '选择界面显示语言',
  'dashboard.hero.nextStep': '选择一条任务链开始',
} satisfies Record<TranslationKey, string>;

export const translations = {
  en: enTranslations,
  zh: zhTranslations,
} satisfies Record<Language, Record<TranslationKey, string>>;
