import { useI18n } from '../../i18n';

export function LoadingFallback() {
  const { tr } = useI18n();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-500 dark:text-slate-400 text-sm">{tr('加载中…', 'Loading…')}</p>
      </div>
    </div>
  );
}

