import { AlertTriangle, X } from 'lucide-react';

export function ErrorBanner({
  tr,
  error,
  onDismiss,
}: {
  tr: (zh: string, en: string) => string;
  error: string;
  onDismiss: () => void;
}) {
  return (
    <div className="mx-6 mt-4 flex items-center space-x-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
      <AlertTriangle className="text-red-500" size={20} />
      <span className="flex-1 text-red-700 dark:text-red-300">{error}</span>
      <button
        onClick={onDismiss}
        aria-label={tr('关闭错误提示', 'Dismiss error')}
        className="text-red-500 hover:text-red-700"
      >
        <X size={16} />
      </button>
    </div>
  );
}
