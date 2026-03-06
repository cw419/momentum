import React from 'react';
import {
  Download,
  FileText,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  Upload,
} from 'lucide-react';
import type { ImportExportImportOptions } from '../services/ImportExportService';

export type ImportStatus =
  | 'idle'
  | 'checking-auth'
  | 'creating-session'
  | 'importing'
  | 'success'
  | 'error';

export const ImportInfoBox: React.FC<{
  tr: (zh: string, en: string) => string;
}> = ({ tr }) => (
  <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-700/50 dark:bg-yellow-900/20">
    <h3 className="mb-3 font-chinese text-lg font-bold text-yellow-900 dark:text-yellow-100">
      {tr('导入任务链数据', 'Import data')}
    </h3>
    <p className="mb-4 font-chinese text-sm leading-relaxed text-yellow-700 dark:text-yellow-300">
      {tr(
        '导入功能将添加新的数据到您的系统中，包括任务链、国策树扩展数据、宠物状态和例外规则。导入的链条将生成新的ID，不会覆盖现有数据。',
        'Import adds new data to your system, including chains, extended RSIP data, pet state, and exception rules. Imported chains get new IDs and will not overwrite existing data.',
      )}
    </p>
    <div className="mb-4 space-y-2">
      {[
        tr('任务链数据（生成新ID）', 'Chains (new IDs)'),
        tr('国策树节点与扩展记录', 'RSIP nodes & extended records'),
        tr('宠物状态（覆盖导入）', 'Pet state (overwrite on import)'),
        tr('例外规则（跳过重复）', 'Exception rules (skip duplicates)'),
      ].map((text, i) => (
        <div
          key={i}
          className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400"
        >
          <CheckCircle size={16} />
          <span className="font-chinese text-sm">{text}</span>
        </div>
      ))}
    </div>
    <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
      <AlertCircle size={16} />
      <span className="font-chinese text-sm">
        {tr(
          '请确保导入的是从 Momentum 导出的有效 JSON 文件',
          'Make sure the JSON file was exported from Momentum',
        )}
      </span>
    </div>
  </div>
);

export const FileUploadSection: React.FC<{
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tr: (zh: string, en: string) => string;
}> = ({ onFileUpload, tr }) => (
  <div className="space-y-4">
    <label className="block font-chinese text-sm font-medium text-gray-700 dark:text-slate-300">
      {tr('选择文件导入', 'Choose a file')}
    </label>
    <input
      type="file"
      name="importFile"
      accept=".json"
      onChange={onFileUpload}
      aria-label={tr('选择要导入的文件', 'Choose a file to import')}
      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 transition duration-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
    />
  </div>
);

export const ManualInputSection: React.FC<{
  importData: string;
  onImportDataChange: (data: string) => void;
  tr: (zh: string, en: string) => string;
}> = ({ importData, onImportDataChange, tr }) => (
  <div className="space-y-4">
    <label className="block font-chinese text-sm font-medium text-gray-700 dark:text-slate-300">
      {tr('或手动粘贴 JSON 数据', 'Or paste JSON manually')}
    </label>
    <textarea
      name="importData"
      value={importData}
      onChange={(e) => onImportDataChange(e.target.value)}
      placeholder={tr(
        '粘贴从 Momentum 导出的 JSON 数据...',
        'Paste the JSON exported from Momentum...',
      )}
      aria-label={tr('JSON 数据', 'JSON data')}
      className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-900 placeholder-gray-400 transition duration-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
      rows={8}
    />
  </div>
);

const OptionCheckbox: React.FC<{
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
  label: string;
  ariaLabel: string;
}> = ({ name, checked, onChange, icon, label, ariaLabel }) => (
  <label className="flex cursor-pointer items-center space-x-3">
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={ariaLabel}
      className="form-checkbox h-4 w-4 rounded text-primary-500 focus:ring-primary-500"
    />
    <div className="flex items-center space-x-2">
      {icon}
      <span className="font-chinese text-sm text-gray-700 dark:text-slate-300">
        {label}
      </span>
    </div>
  </label>
);

export const ImportOptionsSection: React.FC<{
  importOptions: ImportExportImportOptions;
  onImportOptionsChange: (options: ImportExportImportOptions) => void;
  tr: (zh: string, en: string) => string;
}> = ({ importOptions, onImportOptionsChange, tr }) => (
  <div className="space-y-4">
    <h4 className="font-chinese text-sm font-medium text-gray-700 dark:text-slate-300">
      {tr('导入选项', 'Import options')}
    </h4>
    <div className="space-y-3 rounded-2xl bg-gray-50 p-4 dark:bg-slate-700/50">
      <OptionCheckbox
        name="preserveStatistics"
        checked={importOptions.preserveStatistics}
        onChange={(checked) =>
          onImportOptionsChange({
            ...importOptions,
            preserveStatistics: checked,
          })
        }
        icon={<Shield size={16} className="text-gray-500" />}
        label={tr(
          '保留统计数据（连击数、完成次数等）',
          'Preserve statistics (streaks, completions, etc.)',
        )}
        ariaLabel={tr('保留统计数据', 'Preserve statistics')}
      />
      <OptionCheckbox
        name="preserveTimestamps"
        checked={importOptions.preserveTimestamps}
        onChange={(checked) =>
          onImportOptionsChange({
            ...importOptions,
            preserveTimestamps: checked,
          })
        }
        icon={<Clock size={16} className="text-gray-500" />}
        label={tr(
          '保留原始时间戳（创建时间、完成时间等）',
          'Preserve original timestamps (createdAt, completedAt, etc.)',
        )}
        ariaLabel={tr('保留原始时间戳', 'Preserve original timestamps')}
      />
      <OptionCheckbox
        name="importCompletionHistory"
        checked={importOptions.importCompletionHistory}
        onChange={(checked) =>
          onImportOptionsChange({
            ...importOptions,
            importCompletionHistory: checked,
          })
        }
        icon={<FileText size={16} className="text-gray-500" />}
        label={tr('导入完成历史记录', 'Import completion history')}
        ariaLabel={tr('导入完成历史记录', 'Import completion history')}
      />
    </div>
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-700/50 dark:bg-blue-900/20">
      <div className="flex items-start space-x-2">
        <Shield size={16} className="mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="font-chinese text-xs text-blue-700 dark:text-blue-300">
          <p className="mb-1 font-medium">
            {tr('安全导入机制', 'Safe import')}
          </p>
          <p>
            {tr(
              '• 所有导入数据将自动归属到您的账户',
              '• Imported data is automatically associated with your account',
            )}
          </p>
          <p>
            {tr(
              '• ID 冲突将自动解决，生成新的唯一标识',
              '• ID conflicts are resolved automatically with new unique IDs',
            )}
          </p>
          <p>
            {tr(
              '• 导入会话 30 分钟后自动过期',
              '• Import sessions expire automatically after 30 minutes',
            )}
          </p>
        </div>
      </div>
    </div>
  </div>
);

export const ImportStatusDisplay: React.FC<{
  importStatus: ImportStatus;
  importError: string;
  tr: (zh: string, en: string) => string;
}> = ({ importStatus, importError, tr }) => {
  if (importStatus === 'idle') return null;
  const statusConfig: Record<
    string,
    { bg: string; text: string; message: string; spinner?: boolean }
  > = {
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
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50',
      text: 'text-red-700 dark:text-red-300',
      message: '',
    },
  };
  const config = statusConfig[importStatus];
  if (!config) return null;
  if (importStatus === 'error') {
    return (
      <div className={`${config.bg} rounded-2xl border p-4`}>
        <div className={`flex items-start space-x-3 ${config.text}`}>
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
    <div className={`${config.bg} rounded-2xl border p-4`}>
      <div className={`flex items-center space-x-3 ${config.text}`}>
        {config.spinner ? (
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600"></div>
        ) : (
          <CheckCircle size={20} />
        )}
        <span className="font-chinese font-medium">{config.message}</span>
      </div>
    </div>
  );
};

export const ImportButton: React.FC<{
  importStatus: ImportStatus;
  isImportDisabled: boolean;
  isImporting: boolean;
  onImport: () => void;
  tr: (zh: string, en: string) => string;
}> = ({ importStatus, isImportDisabled, isImporting, onImport, tr }) => {
  const buttonTextByStatus: Partial<Record<ImportStatus, string>> = {
    'checking-auth': tr('验证身份中...', 'Verifying...'),
    'creating-session': tr('创建会话中...', 'Creating session...'),
    importing: tr('安全导入中...', 'Importing...'),
  };
  const buttonText =
    buttonTextByStatus[importStatus] ?? tr('安全导入数据', 'Import data');
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
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
        ) : (
          <Upload size={20} />
        )}
        <span>{buttonText}</span>
      </button>
    </div>
  );
};

export const ExportTab: React.FC<{
  chainsCount: number;
  language: 'zh' | 'en';
  onExport: () => void;
  tr: (zh: string, en: string) => string;
}> = ({ chainsCount, language, onExport, tr }) => (
  <div className="space-y-6">
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-700/50 dark:bg-blue-900/20">
      <h3 className="mb-3 font-chinese text-lg font-bold text-blue-900 dark:text-blue-100">
        {tr('导出任务链数据', 'Export your data')}
      </h3>
      <p className="mb-4 font-chinese text-sm leading-relaxed text-blue-700 dark:text-blue-300">
        {tr(
          '导出功能将保存您当前的所有数据，包括任务链配置、统计数据、国策树扩展数据、宠物状态和例外规则。',
          'Export saves all your current data, including chains, stats, extended RSIP data, pet state, and exception rules.',
        )}
      </p>
      <div className="space-y-2">
        {[
          tr('任务链配置与统计', 'Chain config & stats'),
          tr('完成历史记录', 'Completion history'),
          tr('国策树（RSIP）完整数据', 'Full RSIP dataset'),
          tr('宠物状态', 'Pet state'),
          tr('例外规则配置', 'Exception rules'),
        ].map((text, i) => (
          <div
            key={i}
            className="flex items-center space-x-2 text-blue-600 dark:text-blue-400"
          >
            <CheckCircle size={16} />
            <span className="font-chinese text-sm">{text}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="text-center">
      <p className="mb-4 font-chinese text-gray-600 dark:text-slate-400">
        {language === 'zh' ? (
          <>
            当前共有{' '}
            <span className="font-bold text-primary-500">{chainsCount}</span>{' '}
            条任务链
          </>
        ) : (
          <>
            You have{' '}
            <span className="font-bold text-primary-500">{chainsCount}</span>{' '}
            chain{chainsCount === 1 ? '' : 's'}
          </>
        )}
      </p>
      <button
        type="button"
        onClick={onExport}
        disabled={chainsCount === 0}
        aria-label={tr('导出为 JSON 文件', 'Export as JSON')}
        className="gradient-primary mx-auto flex items-center space-x-3 rounded-2xl px-8 py-4 font-chinese font-medium text-white shadow-lg transition duration-300 hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
      >
        <Download size={20} />
        <span>{tr('导出为 JSON 文件', 'Export as JSON')}</span>
      </button>
    </div>
  </div>
);
