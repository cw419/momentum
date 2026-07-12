import type React from 'react';
import { AlertCircle, CheckCircle, Upload } from 'lucide-react';
import type { ImportStatus } from './types';

type Tr = (zh: string, en: string) => string;

export const ImportStatusDisplay: React.FC<{
  importStatus: ImportStatus;
  importError: string;
  tr: Tr;
}> = ({ importStatus, importError, tr }) => {
  if (importStatus === 'idle') return null;
  const statusConfig = {
    'checking-auth': {
      bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50',
      text: 'text-blue-700 dark:text-blue-300',
      message: tr('正在验证用户身份...', 'Verifying your account...'),
      spinner: true,
    },
    'creating-session': {
      bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50',
      text: 'text-blue-700 dark:text-blue-300',
      message: tr(
        '正在创建安全导入会话...',
        'Creating a safe import session...',
      ),
      spinner: true,
    },
    importing: {
      bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50',
      text: 'text-blue-700 dark:text-blue-300',
      message: tr('正在安全导入数据，请稍候...', 'Importing data safely...'),
      spinner: true,
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50',
      text: 'text-green-700 dark:text-green-300',
      message: tr(
        '导入成功！任务链已添加到您的系统中。',
        'Import successful! The chains have been added.',
      ),
      spinner: false,
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50',
      text: 'text-red-700 dark:text-red-300',
      message: '',
      spinner: false,
    },
  }[importStatus];
  if (!statusConfig) return null;
  if (importStatus === 'error') {
    return (
      <div className={`${statusConfig.bg} rounded-2xl border p-4`}>
        <div className={`flex items-start space-x-3 ${statusConfig.text}`}>
          <AlertCircle size={20} className="mt-0.5" />
          <div>
            <p className="mb-1 font-chinese font-medium">
              {tr('导入失败', 'Import failed')}
            </p>
            <p className="font-chinese text-sm">{importError}</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`${statusConfig.bg} rounded-2xl border p-4`}>
      <div className={`flex items-center space-x-3 ${statusConfig.text}`}>
        {statusConfig.spinner ? (
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600" />
        ) : (
          <CheckCircle size={20} />
        )}
        <span className="font-chinese font-medium">{statusConfig.message}</span>
      </div>
    </div>
  );
};

export const ImportButton: React.FC<{
  importStatus: ImportStatus;
  isImportDisabled: boolean;
  isImporting: boolean;
  onImport: () => void;
  tr: Tr;
}> = ({ importStatus, isImportDisabled, isImporting, onImport, tr }) => {
  const textByStatus: Partial<Record<ImportStatus, string>> = {
    'checking-auth': tr('验证身份中...', 'Verifying...'),
    'creating-session': tr('创建会话中...', 'Creating session...'),
    importing: tr('安全导入中...', 'Importing...'),
  };
  const text = textByStatus[importStatus] ?? tr('安全导入数据', 'Import data');
  return (
    <div className="text-center">
      <button
        type="button"
        onClick={onImport}
        disabled={isImportDisabled}
        aria-label={tr('导入数据', 'Import data')}
        className="gradient-primary mx-auto flex items-center space-x-3 rounded-2xl px-8 py-4 font-chinese font-medium text-white shadow-lg transition duration-300 hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
      >
        {isImporting ? (
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
        ) : (
          <Upload size={20} />
        )}
        <span>{text}</span>
      </button>
    </div>
  );
};
