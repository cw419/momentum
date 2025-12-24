export type Language = 'en' | 'zh';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    'language.english': 'English',
    'language.chinese': 'Chinese',

    'settings.title': 'Personal Settings',
    'settings.button': 'Settings',
    'settings.language.title': 'Language',
    'settings.language.description': 'Choose the display language',
  },
  zh: {
    'language.english': '英文',
    'language.chinese': '中文',

    'settings.title': '个人设置',
    'settings.button': '设置',
    'settings.language.title': '语言',
    'settings.language.description': '选择界面显示语言',
  },
};
