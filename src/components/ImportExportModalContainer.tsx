import React, { useState, useCallback } from 'react';
import type {
  Chain,
  CompletionHistory,
  ExceptionRule,
  RSIPExecutionRecord,
  RSIPLibraryEntry,
  RSIPNode,
  RSIPNodeGroup,
  RSIPMeta,
  RSIPRunRecord,
  RSIPTaskLink,
} from '../types';
import type { PetState } from '../types/pet';
import { exceptionRuleManager } from '../services/ExceptionRuleManager';
import {
  importExportService,
  type ImportExportImportOptions,
  type MomentumExportDataV3,
} from '../services/ImportExportService';
import { useStorage } from '../storage/useStorage';
import { logger } from '../utils/logger';
import { useI18n, type Language } from '../i18n';
import { getSafeErrorDetail } from '../utils/errorMessage';
import { normalizeUnknownError } from '../utils/errors/normalizeError';
import { getPlatformCapabilityCenter } from '../utils/platform-capabilities/center';
import { ImportExportModalView } from './ImportExportModalView';
import type { ImportStatus } from './ImportExportModalParts';

async function ensureAuthenticatedForImport(
  storage: ReturnType<typeof useStorage>,
  tr: (zh: string, en: string) => string,
) {
  if (storage.kind !== 'supabase') return;

  const authResult = await storage.waitForAuthentication(10000);
  if (
    !authResult.ok ||
    !authResult.value.isAuthenticated ||
    !authResult.value.user
  ) {
    throw new Error(
      tr(
        '用户身份验证失败。请确保您已正确登录，然后重试导入操作。',
        'Authentication failed. Please make sure you are signed in and try importing again.',
      ),
    );
  }
}

function getImportErrorMessage(
  error: unknown,
  language: Language,
  tr: (zh: string, en: string) => string,
) {
  if (error instanceof SyntaxError) {
    return tr(
      '导入数据格式错误：请确保上传的是有效的JSON格式文件。',
      'Invalid import format: please make sure you uploaded a valid JSON file.',
    );
  }

  if (error instanceof Error) {
    if (
      error.message.includes('身份验证失败') ||
      error.message.includes('Authentication failed')
    ) {
      return tr(
        '用户身份验证失败：请确保您已正确登录，然后重试导入操作。',
        'Authentication failed: please make sure you are signed in and try importing again.',
      );
    }

    if (error.message.includes('导入数据格式错误')) {
      return tr(
        '导入数据格式错误：文件中未找到有效的链条数据。请确保文件是从Momentum导出的有效数据。',
        'Invalid import format: no valid chains found. Please make sure this file was exported from Momentum.',
      );
    }

    const safeDetail = getSafeErrorDetail(error.message, language);
    if (safeDetail) {
      return tr(`导入失败：${safeDetail}`, `Import failed: ${safeDetail}`);
    }

    return tr(
      '导入失败，请重试（详情见控制台）',
      'Import failed. Check the console for details, then try again.',
    );
  }

  return tr('导入失败：未知错误', 'Import failed: unknown error');
}

interface ImportExportModalContainerProps {
  chains: Chain[];
  history?: CompletionHistory[];
  rsipNodes?: RSIPNode[];
  rsipMeta?: RSIPMeta;
  rsipGroups?: RSIPNodeGroup[];
  rsipPolicyLibrary?: RSIPLibraryEntry[];
  rsipRunHistory?: RSIPRunRecord[];
  rsipExecutionRecords?: RSIPExecutionRecord[];
  rsipTaskLinks?: RSIPTaskLink[];
  petState?: PetState | null;
  userPreferences?: unknown;
  onImport: (
    chains: Chain[],
    options?: {
      history?: CompletionHistory[];
      rsipNodes?: RSIPNode[];
      rsipMeta?: RSIPMeta;
      rsipGroups?: RSIPNodeGroup[];
      rsipPolicyLibrary?: RSIPLibraryEntry[];
      rsipRunHistory?: RSIPRunRecord[];
      rsipExecutionRecords?: RSIPExecutionRecord[];
      rsipTaskLinks?: RSIPTaskLink[];
      petState?: PetState;
      exceptionRules?: ExceptionRule[];
    },
  ) => Promise<void>;
  onClose: () => void;
}

export const ImportExportModalContainer: React.FC<
  ImportExportModalContainerProps
> = ({
  chains,
  history,
  rsipNodes,
  rsipMeta,
  rsipGroups,
  rsipPolicyLibrary,
  rsipRunHistory,
  rsipExecutionRecords,
  rsipTaskLinks,
  petState,
  userPreferences,
  onImport,
  onClose,
}) => {
  const { language, tr } = useI18n();
  const storage = useStorage();
  const isSupabase = storage.kind === 'supabase';
  const capabilityCenter = getPlatformCapabilityCenter();

  const [activeTab, setActiveTab] = useState<'export' | 'import'>(
    chains.length === 0 ? 'import' : 'export',
  );
  const [importData, setImportData] = useState('');
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importError, setImportError] = useState('');
  const [importOptions, setImportOptions] = useState<ImportExportImportOptions>(
    {
      preserveStatistics: false,
      preserveTimestamps: false,
      importCompletionHistory: true,
    },
  );

  const handleExport = useCallback(async () => {
    try {
      const exceptionRulesData = await exceptionRuleManager.exportRules(true);

      const exportData: MomentumExportDataV3 =
        importExportService.createExportData({
          chains,
          history,
          rsipNodes,
          rsipMeta,
          rsipGroups,
          rsipPolicyLibrary,
          rsipRunHistory,
          rsipExecutionRecords,
          rsipTaskLinks,
          petState,
          userPreferences,
          exceptionRules: exceptionRulesData,
        });

      const dataStr = JSON.stringify(exportData, null, 2);
      const saved = await capabilityCenter.file.saveFile(
        dataStr,
        `momentum-data-${new Date().toISOString().split('T')[0]}.json`,
      );
      if (!saved) {
        logger.warn('IMPORT_EXPORT', 'Export canceled or unsupported');
      }
    } catch (error) {
      logger.error(
        'IMPORT_EXPORT',
        'Export failed',
        undefined,
        normalizeUnknownError(error),
      );
    }
  }, [
    capabilityCenter.file,
    chains,
    history,
    rsipExecutionRecords,
    rsipGroups,
    rsipMeta,
    rsipNodes,
    rsipPolicyLibrary,
    rsipRunHistory,
    rsipTaskLinks,
    petState,
    userPreferences,
  ]);

  const handleImport = useCallback(async () => {
    try {
      setImportStatus('checking-auth');
      setImportError('');

      if (isSupabase) await ensureAuthenticatedForImport(storage, tr);

      setImportStatus('creating-session');

      const parsedData = importExportService.parseImportData({
        json: importData,
        options: importOptions,
        existingRsipNodes: rsipNodes,
        existingRsipGroups: rsipGroups,
        tr,
      });

      if (
        parsedData.invalidReferences.rsipExecutionRecordsSkipped > 0 ||
        parsedData.invalidReferences.rsipTaskLinksSkipped > 0
      ) {
        logger.warn(
          'IMPORT_EXPORT',
          'Skipped invalid RSIP relation records during import',
          parsedData.invalidReferences,
        );
      }

      let importedExceptionRules: ExceptionRule[] = [];
      if (parsedData.exceptionRulesToImport.length > 0) {
        const importResult = await exceptionRuleManager.importRules(
          parsedData.exceptionRulesToImport,
          {
            skipDuplicates: true,
            updateExisting: false,
          },
        );
        importedExceptionRules = importResult.imported;
      }

      setImportStatus('importing');

      await onImport(parsedData.chains, {
        history: parsedData.history,
        rsipNodes: parsedData.rsipNodes,
        rsipMeta: parsedData.rsipMeta,
        rsipGroups: parsedData.rsipGroups,
        rsipPolicyLibrary: parsedData.rsipPolicyLibrary,
        rsipRunHistory: parsedData.rsipRunHistory,
        rsipExecutionRecords: parsedData.rsipExecutionRecords,
        rsipTaskLinks: parsedData.rsipTaskLinks,
        petState: parsedData.petState,
        exceptionRules: importedExceptionRules,
      });

      setImportStatus('success');

      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      logger.error(
        'IMPORT_EXPORT',
        'Import failed',
        undefined,
        normalizeUnknownError(error),
      );
      setImportError(getImportErrorMessage(error, language, tr));
      setImportStatus('error');
    }
  }, [
    importData,
    importOptions,
    isSupabase,
    language,
    onClose,
    onImport,
    rsipGroups,
    rsipNodes,
    storage,
    tr,
  ]);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportData(content);
      };
      reader.readAsText(file);
    },
    [],
  );

  const handleOpenFile = useCallback(async () => {
    const content = await capabilityCenter.file.openFile(['json']);
    if (content) {
      setImportData(content);
    }
  }, [capabilityCenter.file]);

  const handleTabChange = useCallback((tab: 'export' | 'import') => {
    setActiveTab(tab);
  }, []);

  const handleImportDataChange = useCallback((data: string) => {
    setImportData(data);
  }, []);

  const handleImportOptionsChange = useCallback(
    (options: ImportExportImportOptions) => {
      setImportOptions(options);
    },
    [],
  );

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
      onOpenFile={handleOpenFile}
      onExport={handleExport}
      onImport={handleImport}
      onClose={onClose}
      tr={tr}
    />
  );
};
