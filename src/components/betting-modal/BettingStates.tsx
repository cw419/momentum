import React from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export const LoadingState: React.FC<{ tr: (zh: string, en: string) => string }> = ({ tr }) => (
  <div className="text-center py-8">
    <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-3" />
    <p className="text-gray-600 dark:text-gray-300">{tr('加载押注数据...', 'Loading betting data...')}</p>
  </div>
);

interface ErrorStateProps {
  error: string;
  tr: (zh: string, en: string) => string;
  onReload: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, tr, onReload }) => (
  <div className="text-center py-8">
    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
    <button
      type="button"
      onClick={onReload}
      aria-label={tr('重新加载数据', 'Reload data')}
      className="text-primary-500 hover:text-primary-600 font-medium transition-colors focus-ring rounded"
    >
      {tr('重新加载', 'Reload')}
    </button>
  </div>
);

interface SuccessStateProps {
  successMessage: string;
  tr: (zh: string, en: string) => string;
}

export const SuccessState: React.FC<SuccessStateProps> = ({ successMessage, tr }) => (
  <div className="text-center py-8">
    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
    <p className="text-green-700 dark:text-green-300 font-medium text-lg mb-2">
      {tr('押注成功！', 'Bet placed!')}
    </p>
    <p className="text-gray-600 dark:text-gray-400 text-sm">{successMessage}</p>
  </div>
);
