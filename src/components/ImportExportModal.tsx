import React, { useState } from 'react';
import type { Chain, CompletionHistory, ExceptionRule, RSIPNode, RSIPMeta } from '../types';
import { Download, Upload, X, FileText, AlertCircle, CheckCircle, Clock, Shield } from 'lucide-react';
import { exceptionRuleManager } from '../services/ExceptionRuleManager';
import { importExportService, type ImportExportImportOptions, type MomentumExportDataV2 } from '../services/ImportExportService';
import { useStorage } from '../storage/useStorage';
import { logger } from '../utils/logger';
import { useI18n } from '../i18n';
import { getSafeErrorDetail } from '../utils/errorMessage';

interface ImportExportModalProps {
  chains: Chain[];
  history?: CompletionHistory[];
  rsipNodes?: RSIPNode[];
  rsipMeta?: RSIPMeta;
  userPreferences?: unknown;
  onImport: (chains: Chain[], options?: { history?: CompletionHistory[]; rsipNodes?: RSIPNode[]; rsipMeta?: RSIPMeta; exceptionRules?: ExceptionRule[] }) => Promise<void>;
  onClose: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
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
  const [importStatus, setImportStatus] = useState<'idle' | 'checking-auth' | 'creating-session' | 'importing' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState('');
  const [importOptions, setImportOptions] = useState<ImportExportImportOptions>({
    preserveStatistics: false,
    preserveTimestamps: false,
    importCompletionHistory: true
  });

  const handleExport = async () => {
    try {
      // 获取例外规则数据
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
  };

  const handleImport = async () => {
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
      
      // 3秒后自动关闭
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (error) {
      logger.error('IMPORT_EXPORT', 'Import failed', undefined, error as Error);
      
      // 提供具体的错误信息
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
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-600 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center">
              <FileText className="text-primary-500" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100">
                {tr('数据管理', 'Data management')}
              </h2>
              <p className="text-sm font-mono text-gray-500 tracking-wide">
                {tr('数据管理', 'DATA MANAGEMENT')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors duration-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-100 dark:bg-slate-700 rounded-2xl p-1 mb-8">
          {chains.length > 0 && (
            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 font-chinese ${
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
            onClick={() => setActiveTab('import')}
            className={`${chains.length > 0 ? 'flex-1' : 'w-full'} px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 font-chinese ${
              activeTab === 'import'
                ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
            }`}
          >
            <Upload size={16} />
            <span>{tr('导入数据', 'Import')}</span>
          </button>
        </div>

        {/* Tab Content */}

        {/* Export Tab */}
        {activeTab === 'export' && chains.length > 0 && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-bold font-chinese text-blue-900 dark:text-blue-100 mb-3">
                {tr('导出任务链数据', 'Export your data')}
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm mb-4 font-chinese leading-relaxed">
                {tr(
                  '导出功能将保存您当前的所有数据，包括任务链配置、统计数据、国策树和例外规则。',
                  'Export saves all your current data, including chains, stats, RSIP tree, and exception rules.'
                )}
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <CheckCircle size={16} />
                  <span className="font-chinese text-sm">{tr('任务链配置与统计', 'Chain config & stats')}</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <CheckCircle size={16} />
                  <span className="font-chinese text-sm">{tr('完成历史记录', 'Completion history')}</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <CheckCircle size={16} />
                  <span className="font-chinese text-sm">{tr('国策树（RSIP）数据', 'RSIP tree data')}</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <CheckCircle size={16} />
                  <span className="font-chinese text-sm">{tr('例外规则配置', 'Exception rules')}</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-gray-600 dark:text-slate-400 mb-4 font-chinese">
                {language === 'zh' ? (
                  <>
                    当前共有 <span className="font-bold text-primary-500">{chains.length}</span> 条任务链
                  </>
                ) : (
                  <>
                    You have <span className="font-bold text-primary-500">{chains.length}</span>{' '}
                    chain{chains.length === 1 ? '' : 's'}
                  </>
                )}
              </p>
              <button
                onClick={handleExport}
                disabled={chains.length === 0}
                className="gradient-primary hover:shadow-xl text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-3 mx-auto hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-chinese"
              >
                <Download size={20} />
                <span>{tr('导出为 JSON 文件', 'Export as JSON')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Import Tab */}
        {(activeTab === 'import' || chains.length === 0) && (
          <div className="space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-bold font-chinese text-yellow-900 dark:text-yellow-100 mb-3">
                {tr('导入任务链数据', 'Import data')}
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-4 font-chinese leading-relaxed">
                {tr(
                  '导入功能将添加新的数据到您的系统中，包括任务链、国策树和例外规则。导入的链条将生成新的ID，不会覆盖现有数据。',
                  'Import adds new data to your system, including chains, RSIP, and exception rules. Imported chains get new IDs and will not overwrite existing data.'
                )}
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                  <CheckCircle size={16} />
                  <span className="text-sm font-chinese">{tr('任务链数据（生成新ID）', 'Chains (new IDs)')}</span>
                </div>
                <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                  <CheckCircle size={16} />
                  <span className="text-sm font-chinese">{tr('国策树节点与配置', 'RSIP nodes & config')}</span>
                </div>
                <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                  <CheckCircle size={16} />
                  <span className="text-sm font-chinese">{tr('例外规则（跳过重复）', 'Exception rules (skip duplicates)')}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                <AlertCircle size={16} />
                <span className="text-sm font-chinese">
                  {tr('请确保导入的是从 Momentum 导出的有效 JSON 文件', 'Make sure the JSON file was exported from Momentum')}
                </span>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <label className="block text-gray-700 dark:text-slate-300 text-sm font-medium font-chinese">
                {tr('选择文件导入', 'Choose a file')}
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300"
              />
            </div>

            {/* Manual Input */}
            <div className="space-y-4">
              <label className="block text-gray-700 dark:text-slate-300 text-sm font-medium font-chinese">
                {tr('或手动粘贴 JSON 数据', 'Or paste JSON manually')}
              </label>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder={tr('粘贴从 Momentum 导出的 JSON 数据...', 'Paste the JSON exported from Momentum...')}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 resize-none font-mono text-sm"
                rows={8}
              />
            </div>

            {/* Import Options */}
            <div className="space-y-4">
              <h4 className="text-gray-700 dark:text-slate-300 text-sm font-medium font-chinese">
                {tr('导入选项', 'Import options')}
              </h4>
              
              <div className="space-y-3 bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importOptions.preserveStatistics}
                    onChange={(e) => setImportOptions(prev => ({
                      ...prev,
                      preserveStatistics: e.target.checked
                    }))}
                    className="form-checkbox h-4 w-4 text-primary-500 rounded focus:ring-primary-500"
                  />
                  <div className="flex items-center space-x-2">
                    <Shield size={16} className="text-gray-500" />
                    <span className="text-sm font-chinese text-gray-700 dark:text-slate-300">
                      {tr('保留统计数据（连击数、完成次数等）', 'Preserve statistics (streaks, completions, etc.)')}
                    </span>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importOptions.preserveTimestamps}
                    onChange={(e) => setImportOptions(prev => ({
                      ...prev,
                      preserveTimestamps: e.target.checked
                    }))}
                    className="form-checkbox h-4 w-4 text-primary-500 rounded focus:ring-primary-500"
                  />
                  <div className="flex items-center space-x-2">
                    <Clock size={16} className="text-gray-500" />
                    <span className="text-sm font-chinese text-gray-700 dark:text-slate-300">
                      {tr('保留原始时间戳（创建时间、完成时间等）', 'Preserve original timestamps (createdAt, completedAt, etc.)')}
                    </span>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importOptions.importCompletionHistory}
                    onChange={(e) => setImportOptions(prev => ({
                      ...prev,
                      importCompletionHistory: e.target.checked
                    }))}
                    className="form-checkbox h-4 w-4 text-primary-500 rounded focus:ring-primary-500"
                  />
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className="text-gray-500" />
                    <span className="text-sm font-chinese text-gray-700 dark:text-slate-300">
                      {tr('导入完成历史记录', 'Import completion history')}
                    </span>
                  </div>
                </label>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-3">
                <div className="flex items-start space-x-2">
                  <Shield size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-xs font-chinese text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">{tr('安全导入机制', 'Safe import')}</p>
                    <p>{tr('• 所有导入数据将自动归属到您的账户', '• Imported data is automatically associated with your account')}</p>
                    <p>{tr('• ID 冲突将自动解决，生成新的唯一标识', '• ID conflicts are resolved automatically with new unique IDs')}</p>
                    <p>{tr('• 导入会话 30 分钟后自动过期', '• Import sessions expire automatically after 30 minutes')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Import Status */}
            {importStatus === 'checking-auth' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-2xl p-4">
                <div className="flex items-center space-x-3 text-blue-700 dark:text-blue-300">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="font-chinese font-medium">{tr('正在验证用户身份...', 'Verifying your account...')}</span>
                </div>
              </div>
            )}
            
            {importStatus === 'creating-session' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-2xl p-4">
                <div className="flex items-center space-x-3 text-blue-700 dark:text-blue-300">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="font-chinese font-medium">{tr('正在创建安全导入会话...', 'Creating a safe import session...')}</span>
                </div>
              </div>
            )}
            
            {importStatus === 'importing' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-2xl p-4">
                <div className="flex items-center space-x-3 text-blue-700 dark:text-blue-300">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="font-chinese font-medium">{tr('正在安全导入数据，请稍候...', 'Importing data safely...')}</span>
                </div>
              </div>
            )}
            
            {importStatus === 'success' && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-2xl p-4">
                <div className="flex items-center space-x-3 text-green-700 dark:text-green-300">
                  <CheckCircle size={20} />
                  <span className="font-chinese font-medium">{tr('导入成功！任务链已添加到您的系统中。', 'Import successful! The chains have been added.')}</span>
                </div>
              </div>
            )}

            {importStatus === 'error' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-2xl p-4">
                <div className="flex items-start space-x-3 text-red-700 dark:text-red-300">
                  <AlertCircle size={20} className="mt-0.5" />
                  <div>
                    <p className="font-chinese font-medium mb-1">{tr('导入失败', 'Import failed')}</p>
                    <p className="text-sm font-chinese">{importError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Import Button */}
            <div className="text-center">
              <button
                onClick={handleImport}
                disabled={!importData.trim() || importStatus === 'success' || importStatus === 'checking-auth' || importStatus === 'creating-session' || importStatus === 'importing'}
                className="gradient-primary hover:shadow-xl text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-3 mx-auto hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-chinese"
              >
                {(importStatus === 'checking-auth' || importStatus === 'creating-session' || importStatus === 'importing') ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Upload size={20} />
                )}
                <span>
                  {importStatus === 'checking-auth' 
                    ? tr('验证身份中...', 'Verifying...')
                    : importStatus === 'creating-session'
                      ? tr('创建会话中...', 'Creating session...')
                      : importStatus === 'importing' 
                        ? tr('安全导入中...', 'Importing...')
                        : tr('安全导入数据', 'Import data')
                  }
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
