import React from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export const LoadingState: React.FC<{
  tr: (zh: string, en: string) => string;
}> = ({ tr }) => (
  <div className="py-8 text-center">
    <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary-500" />
    <p className="text-gray-600 dark:text-gray-300">
      {tr('加载押注数据...', 'Loading betting data...')}
    </p>
  </div>
);

interface ErrorStateProps {
  error: string;
  tr: (zh: string, en: string) => string;
  onReload: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  tr,
  onReload,
}) => (
  <div className="py-8 text-center">
    <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
    <p className="mb-4 text-red-600 dark:text-red-400">{error}</p>
    <button
      type="button"
      onClick={onReload}
      aria-label={tr('重新加载数据', 'Reload data')}
      className="focus-ring rounded font-medium text-primary-500 transition-colors hover:text-primary-600"
    >
      {tr('重新加载', 'Reload')}
    </button>
  </div>
);

interface SuccessStateProps {
  successMessage: string;
  tr: (zh: string, en: string) => string;
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  successMessage,
  tr,
}) => (
  <div className="py-8 text-center">
    <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
    <p className="mb-2 text-lg font-medium text-green-700 dark:text-green-300">
      {tr('押注成功！', 'Bet placed!')}
    </p>
    <p className="text-sm text-gray-600 dark:text-gray-400">{successMessage}</p>
  </div>
);
