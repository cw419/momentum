import React from 'react';
import { Download, Upload, X, FileText } from 'lucide-react';
import type { ImportExportImportOptions } from '../services/ImportExportService';
import {
  type ImportStatus,
  ImportInfoBox,
  FileUploadSection,
  ManualInputSection,
  ImportOptionsSection,
  ImportStatusDisplay,
  ImportButton,
  ExportTab,
} from './ImportExportModalParts';

export type { ImportStatus };

export interface ImportExportModalViewProps {
  chainsCount: number;
  activeTab: 'export' | 'import';
  importData: string;
  importStatus: ImportStatus;
  importError: string;
  importOptions: ImportExportImportOptions;
  language: 'zh' | 'en';
  onTabChange: (tab: 'export' | 'import') => void;
  onImportDataChange: (data: string) => void;
  onImportOptionsChange: (options: ImportExportImportOptions) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onImport: () => void;
  onClose: () => void;
  tr: (zh: string, en: string) => string;
}

export const ImportExportModalView: React.FC<ImportExportModalViewProps> = ({
  chainsCount,
  activeTab,
  importData,
  importStatus,
  importError,
  importOptions,
  language,
  onTabChange,
  onImportDataChange,
  onImportOptionsChange,
  onFileUpload,
  onExport,
  onImport,
  onClose,
  tr,
}) => {
  const isImportDisabled = !importData.trim() ||
    importStatus === 'success' ||
    importStatus === 'checking-auth' ||
    importStatus === 'creating-session' ||
    importStatus === 'importing';

  const isImporting = importStatus === 'checking-auth' ||
    importStatus === 'creating-session' ||
    importStatus === 'importing';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-export-modal-title"
        className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-600 shadow-2xl animate-scale-in"
        style={{ overscrollBehavior: 'contain' }}
      >
        <ModalHeader onClose={onClose} tr={tr} />
        <TabNavigation activeTab={activeTab} chainsCount={chainsCount} onTabChange={onTabChange} tr={tr} />

        {activeTab === 'export' && chainsCount > 0 && (
          <ExportTab chainsCount={chainsCount} onExport={onExport} language={language} tr={tr} />
        )}

        {(activeTab === 'import' || chainsCount === 0) && (
          <ImportTab
            importData={importData}
            importStatus={importStatus}
            importError={importError}
            importOptions={importOptions}
            isImportDisabled={isImportDisabled}
            isImporting={isImporting}
            onImportDataChange={onImportDataChange}
            onImportOptionsChange={onImportOptionsChange}
            onFileUpload={onFileUpload}
            onImport={onImport}
            tr={tr}
          />
        )}
      </div>
    </div>
  );
};

const ModalHeader: React.FC<{ onClose: () => void; tr: (zh: string, en: string) => string }> = ({ onClose, tr }) => (
  <div className="flex items-center justify-between mb-8">
    <div className="flex items-center space-x-3">
      <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center">
        <FileText className="text-primary-500" size={24} />
      </div>
      <div>
        <h2 id="import-export-modal-title" className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100">
          {tr('数据管理', 'Data management')}
        </h2>
        <p className="text-sm font-mono text-gray-500 tracking-wide">
          {tr('数据管理', 'DATA MANAGEMENT')}
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      aria-label={tr('关闭', 'Close')}
      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors duration-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"
    >
      <X size={20} />
    </button>
  </div>
);

interface TabNavigationProps {
  activeTab: 'export' | 'import';
  chainsCount: number;
  onTabChange: (tab: 'export' | 'import') => void;
  tr: (zh: string, en: string) => string;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, chainsCount, onTabChange, tr }) => (
  <div className="flex bg-gray-100 dark:bg-slate-700 rounded-2xl p-1 mb-8">
    {chainsCount > 0 && (
      <button
        type="button"
        onClick={() => onTabChange('export')}
        className={`flex-1 px-4 py-3 rounded-xl font-medium transition duration-300 flex items-center justify-center space-x-2 font-chinese ${
          activeTab === 'export'
            ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm'
            : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
        }`}
      >
        <Download size={16} />
        <span>{tr('导出数据', 'Export')}</span>
      </button>
    )}
    <button
      type="button"
      onClick={() => onTabChange('import')}
      className={`${chainsCount > 0 ? 'flex-1' : 'w-full'} px-4 py-3 rounded-xl font-medium transition duration-300 flex items-center justify-center space-x-2 font-chinese ${
        activeTab === 'import'
          ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm'
          : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
      }`}
    >
      <Upload size={16} />
      <span>{tr('导入数据', 'Import')}</span>
    </button>
  </div>
);

interface ImportTabProps {
  importData: string;
  importStatus: ImportStatus;
  importError: string;
  importOptions: ImportExportImportOptions;
  isImportDisabled: boolean;
  isImporting: boolean;
  onImportDataChange: (data: string) => void;
  onImportOptionsChange: (options: ImportExportImportOptions) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  tr: (zh: string, en: string) => string;
}

const ImportTab: React.FC<ImportTabProps> = ({
  importData,
  importStatus,
  importError,
  importOptions,
  isImportDisabled,
  isImporting,
  onImportDataChange,
  onImportOptionsChange,
  onFileUpload,
  onImport,
  tr,
}) => (
  <div className="space-y-6">
    <ImportInfoBox tr={tr} />
    <FileUploadSection onFileUpload={onFileUpload} tr={tr} />
    <ManualInputSection importData={importData} onImportDataChange={onImportDataChange} tr={tr} />
    <ImportOptionsSection importOptions={importOptions} onImportOptionsChange={onImportOptionsChange} tr={tr} />
    <ImportStatusDisplay importStatus={importStatus} importError={importError} tr={tr} />
    <ImportButton
      importStatus={importStatus}
      isImportDisabled={isImportDisabled}
      isImporting={isImporting}
      onImport={onImport}
      tr={tr}
    />
  </div>
);
