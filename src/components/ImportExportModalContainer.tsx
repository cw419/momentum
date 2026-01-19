import React, { useState, useCallback } from 'react';
import type { Chain, CompletionHistory, ExceptionRule, RSIPNode, RSIPMeta } from '../types';
import { exceptionRuleManager } from '../services/ExceptionRuleManager';
import { importExportService, type ImportExportImportOptions, type MomentumExportDataV2 } from '../services/ImportExportService';
import { useStorage } from '../storage/useStorage';
import { logger } from '../utils/logger';
import { useI18n } from '../i18n';
import { getSafeErrorDetail } from '../utils/errorMessage';
import { ImportExportModalView } from './ImportExportModalView';
import type { ImportStatus } from './ImportExportModalParts';

export interface ImportExportModalContainerProps {
  chains: Chain[];
  history?: CompletionHistory[];
  rsipNodes?: RSIPNode[];
  rsipMeta?: RSIPMeta;
  userPreferences?: unknown;
  onImport: (chains: Chain[], options?: { history?: CompletionHistory[]; rsipNodes?: RSIPNode[]; rsipMeta?: RSIPMeta; exceptionRules?: ExceptionRule[] }) => Promise<void>;
  onClose: () => void;
}

export const ImportExportModalContainer: React.FC<ImportExportModalContainerProps> = ({
  chains,
  history,
  rsipNodes,
  rsipMeta,
  userPreferences,
  onImport,
  onClose,
}) => {
  const { language, tr } = useI18n();
  const storage = useStorage();
  const isSupabase = storage.kind === 'supabase';

  const [activeTab, setActiveTab] = useState<'export' | 'import'>(chains.length === 0 ? 'import' : 'export');
  const [importData, setImportData] = useState('');
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importError, setImportError] = useState('');
  const [importOptions, setImportOptions] = useState<ImportExportImportOptions>({
    preserveStatistics: false,
    preserveTimestamps: false,
    importCompletionHistory: true
  });

  const handleExport = useCallback(async () => {
    try {
      const exceptionRulesData = await exceptionRuleManager.exportRules(true);

      const exportData: MomentumExportDataV2 = importExportService.createExportData({
        chains,
        history,
        rsipNodes,
        rsipMeta,
        userPreferences,
        exceptionRules: exceptionRulesData,
      });

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `momentum-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('IMPORT_EXPORT', 'Export failed', undefined, error as Error);
    }
  }, [chains, history, rsipNodes, rsipMeta, userPreferences]);

  const handleImport = useCallback(async () => {
    try {
      setImportStatus('checking-auth');
      setImportError('');

      if (isSupabase) {
        const authResult = await storage.waitForAuthentication(10000);
        if (!authResult.ok || !authResult.value.isAuthenticated || !authResult.value.user) {
          throw new Error(
            tr(
              '用户身份验证失败。请确保您已正确登录，然后重试导入操作。',
              'Authentication failed. Please make sure you are signed in and try importing again.'
            )
          );
        }
      }

      setImportStatus('creating-session');

      const parsedData = importExportService.parseImportData({
        json: importData,
        options: importOptions,
        existingRsipNodes: rsipNodes,
        tr,
      });

      let importedExceptionRules: ExceptionRule[] = [];
      if (parsedData.exceptionRulesToImport.length > 0) {
        const importResult = await exceptionRuleManager.importRules(parsedData.exceptionRulesToImport, {
          skipDuplicates: true,
          updateExisting: false,
        });
        importedExceptionRules = importResult.imported;
      }

      setImportStatus('importing');

      await onImport(parsedData.chains, {
        history: parsedData.history,
        rsipNodes: parsedData.rsipNodes,
        rsipMeta: parsedData.rsipMeta,
        exceptionRules: importedExceptionRules,
      });

      setImportStatus('success');

      setTimeout(() => {
        onClose();
      }, 3000);

    } catch (error) {
      logger.error('IMPORT_EXPORT', 'Import failed', undefined, error as Error);

      let errorMessage = tr('导入失败', 'Import failed');

      if (error instanceof SyntaxError) {
        errorMessage = tr(
          '导入数据格式错误：请确保上传的是有效的JSON格式文件。',
          'Invalid import format: please make sure you uploaded a valid JSON file.'
        );
      } else if (error instanceof Error) {
        if (error.message.includes('身份验证失败') || error.message.includes('Authentication failed')) {
          errorMessage = tr(
            '用户身份验证失败：请确保您已正确登录，然后重试导入操作。',
            'Authentication failed: please make sure you are signed in and try importing again.'
          );
        } else if (error.message.includes('导入数据格式错误')) {
          errorMessage = tr(
            '导入数据格式错误：文件中未找到有效的链条数据。请确保文件是从Momentum导出的有效数据。',
            'Invalid import format: no valid chains found. Please make sure this file was exported from Momentum.'
          );
        } else {
          const safeDetail = getSafeErrorDetail(error.message, language);
          errorMessage = safeDetail
            ? tr(`导入失败：${safeDetail}`, `Import failed: ${safeDetail}`)
            : tr('导入失败，请重试（详情见控制台）', 'Import failed. Check the console for details, then try again.');
        }
      } else {
        errorMessage = tr('导入失败：未知错误', 'Import failed: unknown error');
      }

      setImportError(errorMessage);
      setImportStatus('error');
    }
  }, [importData, importOptions, isSupabase, language, onClose, onImport, rsipNodes, storage, tr]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
    };
    reader.readAsText(file);
  }, []);

  const handleTabChange = useCallback((tab: 'export' | 'import') => {
    setActiveTab(tab);
  }, []);

  const handleImportDataChange = useCallback((data: string) => {
    setImportData(data);
  }, []);

  const handleImportOptionsChange = useCallback((options: ImportExportImportOptions) => {
    setImportOptions(options);
  }, []);

  return (
    <ImportExportModalView
      chainsCount={chains.length}
      activeTab={activeTab}
      importData={importData}
      importStatus={importStatus}
      importError={importError}
      importOptions={importOptions}
      language={language}
      onTabChange={handleTabChange}
      onImportDataChange={handleImportDataChange}
      onImportOptionsChange={handleImportOptionsChange}
      onFileUpload={handleFileUpload}
      onExport={handleExport}
      onImport={handleImport}
      onClose={onClose}
      tr={tr}
    />
  );
};
