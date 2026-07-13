import type { TranslationKey } from '../../i18n';

interface AccountModalLanguageSectionProps {
  language: 'en' | 'zh';
  setLanguage: (language: 'en' | 'zh') => void;
  t: (key: TranslationKey) => string;
}

export function AccountModalLanguageSection({
  language,
  setLanguage,
  t,
}: AccountModalLanguageSectionProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-700">
      <div>
        <h3 className="font-chinese text-base font-medium text-gray-900 dark:text-slate-100">
          {t('settings.language.title')}
        </h3>
        <p className="font-chinese text-xs text-gray-500 dark:text-slate-400">
          {t('settings.language.description')}
        </p>
      </div>
      <div
        className="flex items-center space-x-2"
        role="radiogroup"
        aria-label={t('settings.language.title')}
      >
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition duration-200 ${
            language === 'en'
              ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400'
              : 'border-gray-200 bg-white/80 text-gray-700 hover:bg-white dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
          aria-checked={language === 'en'}
          role="radio"
        >
          {t('language.english')}
        </button>
        <button
          type="button"
          onClick={() => setLanguage('zh')}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition duration-200 ${
            language === 'zh'
              ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400'
              : 'border-gray-200 bg-white/80 text-gray-700 hover:bg-white dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800'
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
