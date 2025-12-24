/**
 * 规则选择对话框组件 - 重构版本
 * 用于在暂停或提前完成任务时选择适用的例外规则
 * 
 * 主要改进：
 * - 移除全局规则支持，只显示链专属规则
 * - 优化布局稳定性，防止抖动
 * - 集成搜索优化器和缓存管理器
 * - 使用乐观更新提升响应速度
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ExceptionRule, 
  ExceptionRuleType, 
  SessionContext,
  PauseOptions
} from '../types';
import { RuleSearchOptimizer, SearchResult } from '../utils/ruleSearchOptimizer';
import { ExceptionRuleCache } from '../utils/exceptionRuleCache';
import { useLayoutStability } from '../utils/LayoutStabilityMonitor';
import { VirtualizedRuleList } from './VirtualizedRuleList';
import { exceptionRuleManager } from '../services/ExceptionRuleManager';
import { logger } from '../utils/logger';
import { isDev } from '../utils/env';
import { useI18n } from '../i18n';
import { getSafeErrorDetail } from '../utils/errorMessage';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  X
} from 'lucide-react';

interface RuleSelectionDialogProps {
  isOpen: boolean;
  actionType: 'pause' | 'early_completion';
  sessionContext: SessionContext;
  onRuleSelected: (rule: ExceptionRule, pauseOptions?: PauseOptions) => void;
  onCreateNewRule: (name: string, type: ExceptionRuleType) => void;
  onCancel: () => void;
}

export const RuleSelectionDialog: React.FC<RuleSelectionDialogProps> = ({
  isOpen,
  actionType,
  sessionContext,
  onRuleSelected,
  onCreateNewRule,
  onCancel
}) => {
  const { language, tr } = useI18n();
  // 状态管理
  const [rules, setRules] = useState<ExceptionRule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | undefined>(15);
  const [isIndefinite, setIsIndefinite] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 工具实例
  const searchOptimizer = useMemo(() => new RuleSearchOptimizer(), []);
  const ruleCache = useMemo(() => new ExceptionRuleCache(), []);
  const { startMonitoring, stopMonitoring } = useLayoutStability(containerRef);

  // 初始化和清理
  useEffect(() => {
    if (isOpen) {
      startMonitoring();
      loadChainRules();
      // 聚焦搜索框
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      stopMonitoring();
      // 重置状态
      setSearchQuery('');
      setError(null);
    }

    return () => {
      stopMonitoring();
    };
  }, [isOpen, sessionContext.chainId]);

  // 搜索处理
  useEffect(() => {
    if (rules.length === 0) return;

    const performSearch = () => {
      searchOptimizer.updateIndex(rules);
      
      if (searchQuery.trim()) {
        searchOptimizer.searchRulesDebounced(rules, searchQuery, (results) => {
          setSearchResults(results);
        });
      } else {
        // 无搜索时按使用频率排序
        const sortedRules = [...rules]
          .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
          .map(rule => ({
            rule,
            score: rule.usageCount || 0,
            matchType: 'exact' as const,
            highlightRanges: []
          }));
        setSearchResults(sortedRules);
      }
    };

    performSearch();
  }, [rules, searchQuery, searchOptimizer]);

  // 加载链专属规则
  const loadChainRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 尝试从缓存获取
      let chainRules = ruleCache.getChainRules(sessionContext.chainId);
      
      if (!chainRules) {
        // 从实际的规则存储中获取规则
        chainRules = await fetchChainRulesFromAPI(sessionContext.chainId, actionType);
        ruleCache.setChainRules(sessionContext.chainId, chainRules);
      }

      setRules(chainRules);
    } catch (err) {
      const safe = err instanceof Error ? getSafeErrorDetail(err.message, language) : null;
      setError(safe ?? tr('加载规则失败', 'Failed to load rules'));
    } finally {
      setLoading(false);
    }
  }, [sessionContext.chainId, actionType, ruleCache, tr, language]);

  // 从实际存储获取规则
  const fetchChainRulesFromAPI = async (chainId: string, actionType: string): Promise<ExceptionRule[]> => {
    try {
      // 获取所有规则
      const allRules = await exceptionRuleManager.getAllRules();
      
      // 过滤出当前链的规则，并且适用于当前操作类型
      const applicableRules = allRules.filter(rule => {
        // 只显示当前链的规则或全局规则
        const isChainRule = rule.chainId === chainId;
        const isGlobalRule = rule.scope === 'global';
        
        if (!isChainRule && !isGlobalRule) {
          return false;
        }
        
        // 检查规则类型是否匹配
        if (actionType === 'pause') {
          return rule.type === ExceptionRuleType.PAUSE_ONLY;
        } else {
          return rule.type === ExceptionRuleType.EARLY_COMPLETION_ONLY;
        }
      });

      // 如果没有规则，创建一些默认的预设规则
      if (applicableRules.length === 0) {
        const defaultRules = await createDefaultPresetRules(chainId, actionType);
        return defaultRules;
      }

      return applicableRules;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('RULE_SELECTION', '获取规则失败', { chainId, actionType }, err);
      // 如果获取失败，返回默认预设规则
      return createDefaultPresetRules(chainId, actionType);
    }
  };

  // 创建默认预设规则
  const createDefaultPresetRules = async (chainId: string, actionType: string): Promise<ExceptionRule[]> => {
    const defaultRuleNames =
      actionType === 'pause'
        ? language === 'zh'
          ? ['上厕所', '接电话']
          : ['Bathroom break', 'Phone call']
        : language === 'zh'
          ? ['提前达成目标']
          : ['Reached goal early'];
    
    const ruleType = actionType === 'pause' 
      ? ExceptionRuleType.PAUSE_ONLY 
      : ExceptionRuleType.EARLY_COMPLETION_ONLY;

    const createdRules: ExceptionRule[] = [];
    const allRules = await exceptionRuleManager.getAllRules();
    const chainRules = allRules.filter(rule => rule.chainId === chainId);
    
    for (const name of defaultRuleNames) {
      try {
        // 检查是否已存在同名规则
        const existingRule = chainRules.find(rule => rule.name === name);
        if (existingRule) {
          createdRules.push(existingRule);
          continue;
        }

        // 创建链专属规则
        const result = await exceptionRuleManager.createChainRule(chainId, name, ruleType);
        createdRules.push(result.rule);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.warn('RULE_SELECTION', `Failed to create default rule "${name}"`, { chainId, actionType }, err);
      }
    }
    
    return createdRules;
  };

  // 选择规则
  const handleRuleSelect = useCallback(async (rule: ExceptionRule) => {
    try {
      if (isDev) {
        logger.debug('RULE_SELECTION', '选择规则', { ruleId: rule.id, actionType });
      }
      
      const pauseOptions: PauseOptions | undefined = actionType === 'pause' ? {
        duration: isIndefinite ? undefined : (duration || 0) * 60,
        autoResume: !isIndefinite
      } : undefined;

      // 直接调用父组件的回调，不使用乐观更新避免重复记录
      if (actionType === 'pause') {
        onRuleSelected(rule, pauseOptions);
      } else {
        onRuleSelected(rule);
      }
    } catch (err) {
      const safe = err instanceof Error ? getSafeErrorDetail(err.message, language) : null;
      setError(safe ?? tr('选择规则失败', 'Failed to select rule'));
    }
  }, [actionType, duration, isIndefinite, onRuleSelected, tr, language]);

  // 创建新规则
  const handleCreateNewRule = useCallback(async (inputName?: string) => {
    const name = inputName || searchQuery.trim();
    if (!name) return;

    try {
      const ruleType = actionType === 'pause' 
        ? ExceptionRuleType.PAUSE_ONLY 
        : ExceptionRuleType.EARLY_COMPLETION_ONLY;

      // 检查重复 - 确保name是字符串
      const cleanName = String(name).trim();
      if (!cleanName) {
        setError(tr('规则名称不能为空', 'Rule name cannot be empty'));
        return;
      }
      
      const duplicateCheck = searchOptimizer.detectDuplicates(cleanName, rules);
      if (duplicateCheck.hasExactMatch) {
        setError(language === 'zh' ? `规则名称 "${cleanName}" 已存在` : `Rule name "${cleanName}" already exists`);
        return;
      }

      // 创建链专属规则
      if (isDev) {
        logger.debug('RULE_SELECTION', '创建链专属规则', {
          cleanName,
          ruleType,
          actionType,
          chainId: sessionContext.chainId,
        });
      }
      await exceptionRuleManager.createChainRule(sessionContext.chainId, cleanName, ruleType);
      
      // 刷新规则列表
      await loadChainRules();
      
      // 通知父组件规则已创建
      onCreateNewRule(cleanName, ruleType);
    } catch (err) {
      const safe = err instanceof Error ? getSafeErrorDetail(err.message, language) : null;
      setError(safe ?? tr('创建规则失败', 'Failed to create rule'));
    }
  }, [rules, actionType, sessionContext.chainId, onCreateNewRule, searchOptimizer, ruleCache, loadChainRules, searchQuery, language, tr]);





  // 获取操作显示名称
  const getActionDisplayName = (): string => {
    return actionType === 'pause' ? tr('暂停计时', 'Pause timer') : tr('提前完成', 'Early completion');
  };

  // 获取操作颜色
  const getActionColor = (): string => {
    return actionType === 'pause' 
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-green-600 dark:text-green-400';
  };

  // 获取操作背景色
  const getActionBgColor = (): string => {
    return actionType === 'pause'
      ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30'
      : 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        ref={containerRef}
        className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        style={{ maxWidth: 'min(640px, 100vw - 2rem)' }}
      >
        {/* 固定头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${getActionBgColor()}`}>
              {actionType === 'pause' ? (
                <Clock className={getActionColor()} size={20} />
              ) : (
                <CheckCircle className={getActionColor()} size={20} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {tr('选择例外规则', 'Choose exception rule')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === 'zh'
                  ? `为${getActionDisplayName()}操作选择适用的规则`
                  : `Choose a rule for ${getActionDisplayName()}`}
              </p>
            </div>
          </div>
          
          <button
            onClick={onCancel}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 固定的任务信息区域 */}
        <div className="flex-shrink-0">
          <div className={`mx-6 mt-4 p-4 rounded-2xl border ${getActionBgColor()}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {sessionContext.chainName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'zh'
                    ? `已进行 ${Math.floor(sessionContext.elapsedTime / 60)} 分钟`
                    : `Elapsed ${Math.floor(sessionContext.elapsedTime / 60)} min`}
                  {sessionContext.remainingTime && (
                    <span>
                      {language === 'zh'
                        ? `，剩余 ${Math.floor(sessionContext.remainingTime / 60)} 分钟`
                        : `, ${Math.floor(sessionContext.remainingTime / 60)} min remaining`}
                    </span>
                  )}
                </p>
              </div>
              <div className={`text-2xl font-mono ${getActionColor()}`}>
                {Math.floor(sessionContext.elapsedTime / 60)}:{(sessionContext.elapsedTime % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          

          {/* 暂停时间设置（仅暂停操作显示） */}
          {actionType === 'pause' && (
            <div className="mx-6 mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">{tr('暂停时长设置', 'Pause duration')}</h3>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  min="1"
                  value={duration || ''}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  placeholder={tr('输入分钟', 'Minutes')}
                  disabled={isIndefinite}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-200 dark:disabled:bg-gray-600"
                />
              </div>
              <div className="flex items-center justify-end mt-2">
                  <label htmlFor="isIndefinite" className="text-sm text-gray-600 dark:text-gray-400 mr-2">
                    {tr('无限时间', 'Indefinite')}
                  </label>
                  <input
                    type="checkbox"
                    id="isIndefinite"
                    checked={isIndefinite}
                    onChange={(e) => {
                        setIsIndefinite(e.target.checked);
                        if (e.target.checked) {
                            setDuration(undefined);
                        }
                    }}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl flex items-center space-x-3">
              <AlertTriangle className="text-red-500" size={20} />
              <span className="text-red-700 dark:text-red-300 flex-1">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* 可滚动内容区域 */}
        <div className="flex-1 overflow-y-auto" data-scroll-container>
          <div className="p-6">
            {/* 搜索栏 */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={tr('搜索规则或输入新规则名称...', 'Search rules or type a new rule name...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>



            {/* 虚拟化规则列表 */}
            <VirtualizedRuleList
              rules={searchResults}
              onSelect={handleRuleSelect}
              onCreateNew={searchQuery.trim() ? (name: string) => handleCreateNewRule(name) : undefined}
              searchQuery={searchQuery}
              isLoading={loading}
              itemHeight={60}
              containerHeight={300}
            />
          </div>
        </div>

        {/* 固定底部 */}
        <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {language === 'zh'
                ? `${searchResults.length} 个可用规则`
                : `${searchResults.length} available rule${searchResults.length === 1 ? '' : 's'}`}
            </div>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              {tr('取消操作', 'Cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
