interface AccountModalLanguageSectionProps {
  language: 'en' | 'zh';
  setLanguage: (language: 'en' | 'zh') => void;
  t: (key: string) => string;
}

export function AccountModalLanguageSection({ language, setLanguage, t }: AccountModalLanguageSectionProps) {
  return (
    <div className="space-y-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-2xl border border-gray-200 dark:border-slate-600">
      <div>
        <h3 className="text-base font-medium font-chinese text-gray-900 dark:text-slate-100">
          {t('settings.language.title')}
        </h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 font-chinese">
          {t('settings.language.description')}
        </p>
      </div>
      <div className="flex items-center space-x-2" role="radiogroup" aria-label={t('settings.language.title')}>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition duration-200 ${
            language === 'en'
              ? 'bg-primary-500/10 border-primary-500 text-primary-600 dark:text-primary-400'
              : 'bg-white/80 dark:bg-slate-800/60 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
          }`}
          aria-checked={language === 'en'}
          role="radio"
        >
          {t('language.english')}
        </button>
        <button
          type="button"
          onClick={() => setLanguage('zh')}
          className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition duration-200 ${
            language === 'zh'
              ? 'bg-primary-500/10 border-primary-500 text-primary-600 dark:text-primary-400'
              : 'bg-white/80 dark:bg-slate-800/60 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
          }`}
          aria-checked={language === 'zh'}
          role="radio"
        >
          {t('language.chinese')}
        </button>
      </div>
    </div>
  );
}
