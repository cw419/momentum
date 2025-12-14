import React, { useState } from 'react';
import { Chain, CompletionHistory, RSIPNode, RSIPMeta } from '../types';
import { Download, Upload, X, FileText, AlertCircle, CheckCircle, Clock, Shield } from 'lucide-react';
import { exceptionRuleManager } from '../services/ExceptionRuleManager';
import { useStorage } from '../storage/StorageContext';
import { logger } from '../utils/logger';

interface ExportData {
  version: string;
  exportedAt: string;
  chains: any[];
  completionHistory: any[];
  rsipNodes?: any[];
  rsipMeta?: any;
  userPreferences?: any;
  exceptionRules?: any;
}

interface ImportOptions {
  preserveStatistics: boolean;
  preserveTimestamps: boolean;
  importCompletionHistory: boolean;
}

const allowedChainTypes = new Set([
  'unit',
  'group',
  'assault',
  'recon',
  'command',
  'special_ops',
  'engineering',
  'quartermaster',
]);

function generateId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

interface ImportExportModalProps {
  chains: Chain[];
  history?: CompletionHistory[];
  rsipNodes?: RSIPNode[];
  rsipMeta?: RSIPMeta;
  userPreferences?: any;
  onImport: (chains: Chain[], options?: { history?: CompletionHistory[]; rsipNodes?: RSIPNode[]; rsipMeta?: RSIPMeta; exceptionRules?: any[] }) => Promise<void>;
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
  const storage = useStorage();
  const isSupabase = storage.kind === 'supabase';
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(chains.length === 0 ? 'import' : 'export');
  const [importData, setImportData] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'checking-auth' | 'creating-session' | 'importing' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState('');
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    preserveStatistics: false,
    preserveTimestamps: false,
    importCompletionHistory: true
  });

  const handleExport = async () => {
    try {
      // 获取例外规则数据
      const exceptionRulesData = await exceptionRuleManager.exportRules(true);
      
      const exportData: ExportData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        chains: chains.map(chain => ({
          ...chain,
          createdAt: chain.createdAt.toISOString(),
          lastCompletedAt: chain.lastCompletedAt?.toISOString(),
          groupStartedAt: chain.groupStartedAt?.toISOString(),
          groupExpiresAt: chain.groupExpiresAt?.toISOString(),
          deletedAt: chain.deletedAt?.toISOString(),
        })),
        completionHistory: (history || []).map(h => ({
          ...h,
          completedAt: h.completedAt.toISOString(),
        })),
        rsipNodes: (rsipNodes || []).map(node => ({
          ...node,
          createdAt: node.createdAt.toISOString(),
        })),
        rsipMeta: rsipMeta ? {
          ...rsipMeta,
          lastAddedAt: rsipMeta.lastAddedAt?.toISOString(),
        } : undefined,
        userPreferences: userPreferences,
        exceptionRules: exceptionRulesData
      };
      
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
          throw new Error('用户身份验证失败。请确保您已正确登录，然后重试导入操作。');
        }
      }

      // 解析导入数据
      const parsedData = JSON.parse(importData);
      
      if (!parsedData.chains || !Array.isArray(parsedData.chains)) {
        throw new Error('导入数据格式错误：未找到有效的链条数据');
      }

      setImportStatus('creating-session');
      
      const toNumber = (value: unknown, fallback: number) => {
        const n = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(n) ? n : fallback;
      };

      const toStringArray = (value: unknown): string[] => {
        if (!Array.isArray(value)) return [];
        return value.map(v => String(v)).filter(v => v.length > 0);
      };

      const rawChains: any[] = parsedData.chains || [];

      const chainEntries = rawChains.map((raw: any) => {
        const sourceId = String(raw?.id ?? generateId('chain'));
        return { raw, sourceId, newId: generateId('chain') };
      });

      const seenIds = new Set<string>();
      for (const entry of chainEntries) {
        if (seenIds.has(entry.sourceId)) {
          throw new Error(`导入数据包含重复的链条ID: ${entry.sourceId}`);
        }
        seenIds.add(entry.sourceId);
      }

      const idMap = new Map<string, string>(chainEntries.map(e => [e.sourceId, e.newId]));
      const preserveStatistics = Boolean(importOptions.preserveStatistics);
      const preserveTimestamps = Boolean(importOptions.preserveTimestamps);

      const importChains: Chain[] = chainEntries.map(({ raw, sourceId: _sourceId, newId }) => {
        void _sourceId;

        const rawType = String(raw?.type ?? 'unit');
        const type = allowedChainTypes.has(rawType) ? rawType : 'unit';

        const stats = preserveStatistics
          ? {
              currentStreak: toNumber(raw?.currentStreak, 0),
              auxiliaryStreak: toNumber(raw?.auxiliaryStreak, 0),
              totalCompletions: toNumber(raw?.totalCompletions, 0),
              totalFailures: toNumber(raw?.totalFailures, 0),
              auxiliaryFailures: toNumber(raw?.auxiliaryFailures, 0),
            }
          : {
              currentStreak: 0,
              auxiliaryStreak: 0,
              totalCompletions: 0,
              totalFailures: 0,
              auxiliaryFailures: 0,
            };

        const createdAt = preserveTimestamps && raw?.createdAt ? new Date(raw.createdAt) : new Date();
        const lastCompletedAt = preserveTimestamps && raw?.lastCompletedAt ? new Date(raw.lastCompletedAt) : undefined;

        const sourceParentId = raw?.parentId ?? raw?.parent_id ?? undefined;
        const parentId =
          sourceParentId != null && idMap.has(String(sourceParentId)) ? idMap.get(String(sourceParentId)) : undefined;

        const common = {
          id: newId,
          name: String(raw?.name ?? '未命名链条'),
          parentId,
          sortOrder: toNumber(raw?.sortOrder ?? raw?.sort_order, Math.floor(Date.now() / 1000)),
          trigger: String(raw?.trigger ?? ''),
          duration: toNumber(raw?.duration, 45),
          description: String(raw?.description ?? ''),
          ...stats,
          exceptions: toStringArray(raw?.exceptions),
          auxiliaryExceptions: toStringArray(raw?.auxiliaryExceptions),
          auxiliarySignal: String(raw?.auxiliarySignal ?? ''),
          auxiliaryDuration: toNumber(raw?.auxiliaryDuration, 15),
          auxiliaryCompletionTrigger: String(raw?.auxiliaryCompletionTrigger ?? ''),
          timeLimitExceptions: toStringArray(raw?.timeLimitExceptions ?? raw?.time_limit_exceptions),
          isDurationless: Boolean(raw?.isDurationless ?? raw?.is_durationless ?? false),
          minimumDuration: raw?.minimumDuration ?? raw?.minimum_duration ?? undefined,
          taskRepeatCount: raw?.taskRepeatCount ?? raw?.task_repeat_count ?? undefined,
          createdAt,
          lastCompletedAt,
          deletedAt: null as null,
        };

        if (type === 'group') {
          return {
            ...common,
            type: 'group',
            timeLimitHours: raw?.timeLimitHours ?? raw?.time_limit_hours ?? undefined,
            groupRepeatCount: raw?.groupRepeatCount ?? raw?.group_repeat_count ?? undefined,
            isTaskGroup: Boolean(raw?.isTaskGroup ?? raw?.is_task_group ?? false) || undefined,
            groupStartedAt: undefined,
            groupExpiresAt: undefined,
          } as Chain;
        }

        return {
          ...common,
          type: type as Chain['type'],
        } as Chain;
      });

      let importHistory: CompletionHistory[] = [];
      if (importOptions.importCompletionHistory && Array.isArray(parsedData.completionHistory)) {
        importHistory = (parsedData.completionHistory || [])
          .filter((h: any) => h && h.chainId)
          .map((h: any): CompletionHistory | null => {
            const mappedChainId = idMap.get(String(h.chainId));
            if (!mappedChainId) return null;

            const duration = Math.max(0, toNumber(h.duration, 0));

            return {
              chainId: mappedChainId,
              completedAt: new Date(h.completedAt || Date.now()),
              duration,
              wasSuccessful: Boolean(h.wasSuccessful),
              reasonForFailure: h.reasonForFailure ? String(h.reasonForFailure) : undefined,
              actualDuration:
                h.actualDuration != null ? Math.max(0, toNumber(h.actualDuration, duration)) : undefined,
              isForwardTimed: Boolean(h.isForwardTimed || false),
              description: h.description ? String(h.description) : undefined,
              notes: h.notes ? String(h.notes) : undefined,
            };
          })
          .filter((h: CompletionHistory | null): h is CompletionHistory => Boolean(h));
      }

      // 处理RSIP节点（保持原有逻辑，因为量较小且复杂度较低）
      let importedRsipNodes: RSIPNode[] = [];
      if (parsedData.rsipNodes) {
        const existingRsipIds = new Set((rsipNodes || []).map(node => node.id));
        
        importedRsipNodes = (parsedData.rsipNodes || []).map((node: any) => {
          let nodeId = node.id;
          
          // 简单的ID冲突处理
          if (existingRsipIds.has(nodeId)) {
            nodeId = crypto.randomUUID ? crypto.randomUUID() : `rsip_${Date.now()}_${Math.random()}`;
            console.log(`RSIP节点ID冲突，生成新ID: ${node.id} -> ${nodeId}`);
          }
          
          existingRsipIds.add(nodeId);
          
          return {
            ...node,
            id: nodeId,
            createdAt: node.createdAt ? new Date(node.createdAt) : new Date(),
            lastScheduledAt: node.lastScheduledAt ? new Date(node.lastScheduledAt) : undefined,
          };
        });
      }

      // 处理RSIP元数据
      const importedRsipMeta = parsedData.rsipMeta ? {
        ...parsedData.rsipMeta,
        lastAddedAt: parsedData.rsipMeta.lastAddedAt ? new Date(parsedData.rsipMeta.lastAddedAt) : undefined,
      } : undefined;

      // 处理例外规则
      let importedExceptionRules: any[] = [];
      if (parsedData.exceptionRules && parsedData.exceptionRules.rules) {
        const rulesToImport = parsedData.exceptionRules.rules.map((rule: any) => ({
          name: rule.name,
          type: rule.type,
          description: rule.description
        }));
        
        const importResult = await exceptionRuleManager.importRules(rulesToImport, {
          skipDuplicates: true,
          updateExisting: false
        });
        
        importedExceptionRules = importResult.imported;
      }

      setImportStatus('importing');

      await onImport(importChains, {
        history: importHistory,
        rsipNodes: importedRsipNodes,
        rsipMeta: importedRsipMeta,
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
      let errorMessage = '导入失败';

      if (error instanceof SyntaxError) {
        errorMessage = '导入数据格式错误：请确保上传的是有效的JSON格式文件。';
      } else if (error instanceof Error) {
        if (error.message.includes('身份验证失败') || error.message.includes('Authentication failed')) {
          errorMessage = '用户身份验证失败：请确保您已正确登录，然后重试导入操作。';
        } else if (error.message.includes('导入数据格式错误')) {
          errorMessage = '导入数据格式错误：文件中未找到有效的链条数据。请确保文件是从Momentum导出的有效数据。';
        } else {
          errorMessage = `导入失败：${error.message}`;
        }
      } else {
        errorMessage = '导入失败：未知错误';
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
                数据管理
              </h2>
              <p className="text-sm font-mono text-gray-500 tracking-wide">
                DATA MANAGEMENT
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
              <span>导出数据</span>
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
            <span>导入数据</span>
          </button>
        </div>

        {/* Tab Content */}

        {/* Export Tab */}
        {activeTab === 'export' && chains.length > 0 && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-bold font-chinese text-blue-900 dark:text-blue-100 mb-3">
                导出任务链数据
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm mb-4 font-chinese leading-relaxed">
                导出功能将保存您当前的所有数据，包括任务链配置、统计数据、国策树和例外规则。
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <CheckCircle size={16} />
                  <span className="font-chinese text-sm">任务链配置与统计</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <CheckCircle size={16} />
                  <span className="font-chinese text-sm">完成历史记录</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <CheckCircle size={16} />
                  <span className="font-chinese text-sm">国策树（RSIP）数据</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <CheckCircle size={16} />
                  <span className="font-chinese text-sm">例外规则配置</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-gray-600 dark:text-slate-400 mb-4 font-chinese">
                当前共有 <span className="font-bold text-primary-500">{chains.length}</span> 条任务链
              </p>
              <button
                onClick={handleExport}
                disabled={chains.length === 0}
                className="gradient-primary hover:shadow-xl text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-3 mx-auto hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-chinese"
              >
                <Download size={20} />
                <span>导出为JSON文件</span>
              </button>
            </div>
          </div>
        )}

        {/* Import Tab */}
        {(activeTab === 'import' || chains.length === 0) && (
          <div className="space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-bold font-chinese text-yellow-900 dark:text-yellow-100 mb-3">
                导入任务链数据
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-4 font-chinese leading-relaxed">
                导入功能将添加新的数据到您的系统中，包括任务链、国策树和例外规则。导入的链条将生成新的ID，不会覆盖现有数据。
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                  <CheckCircle size={16} />
                  <span className="text-sm font-chinese">任务链数据（生成新ID）</span>
                </div>
                <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                  <CheckCircle size={16} />
                  <span className="text-sm font-chinese">国策树节点与配置</span>
                </div>
                <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                  <CheckCircle size={16} />
                  <span className="text-sm font-chinese">例外规则（跳过重复）</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                <AlertCircle size={16} />
                <span className="text-sm font-chinese">请确保导入的是从Momentum导出的有效JSON文件</span>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <label className="block text-gray-700 dark:text-slate-300 text-sm font-medium font-chinese">
                选择文件导入
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
                或手动粘贴JSON数据
              </label>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="粘贴从Momentum导出的JSON数据..."
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 resize-none font-mono text-sm"
                rows={8}
              />
            </div>

            {/* Import Options */}
            <div className="space-y-4">
              <h4 className="text-gray-700 dark:text-slate-300 text-sm font-medium font-chinese">
                导入选项
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
                      保留统计数据（连击数、完成次数等）
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
                      保留原始时间戳（创建时间、完成时间等）
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
                      导入完成历史记录
                    </span>
                  </div>
                </label>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-3">
                <div className="flex items-start space-x-2">
                  <Shield size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-xs font-chinese text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">安全导入机制</p>
                    <p>• 所有导入数据将自动归属到您的账户</p>
                    <p>• ID冲突将自动解决，生成新的唯一标识</p>
                    <p>• 导入会话30分钟后自动过期</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Import Status */}
            {importStatus === 'checking-auth' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-2xl p-4">
                <div className="flex items-center space-x-3 text-blue-700 dark:text-blue-300">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="font-chinese font-medium">正在验证用户身份...</span>
                </div>
              </div>
            )}
            
            {importStatus === 'creating-session' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-2xl p-4">
                <div className="flex items-center space-x-3 text-blue-700 dark:text-blue-300">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="font-chinese font-medium">正在创建安全导入会话...</span>
                </div>
              </div>
            )}
            
            {importStatus === 'importing' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-2xl p-4">
                <div className="flex items-center space-x-3 text-blue-700 dark:text-blue-300">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="font-chinese font-medium">正在安全导入数据，请稍候...</span>
                </div>
              </div>
            )}
            
            {importStatus === 'success' && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-2xl p-4">
                <div className="flex items-center space-x-3 text-green-700 dark:text-green-300">
                  <CheckCircle size={20} />
                  <span className="font-chinese font-medium">导入成功！任务链已添加到您的系统中。</span>
                </div>
              </div>
            )}

            {importStatus === 'error' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-2xl p-4">
                <div className="flex items-start space-x-3 text-red-700 dark:text-red-300">
                  <AlertCircle size={20} className="mt-0.5" />
                  <div>
                    <p className="font-chinese font-medium mb-1">导入失败</p>
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
                    ? '验证身份中...' 
                    : importStatus === 'creating-session'
                      ? '创建会话中...'
                      : importStatus === 'importing' 
                        ? '安全导入中...' 
                        : '安全导入数据'
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
