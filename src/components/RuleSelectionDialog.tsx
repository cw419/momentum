/**
 * 规则选择对话框组件（Container）
 * 用于在暂停或提前完成任务时选择适用的例外规则。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExceptionRule, PauseOptions, SessionContext } from '../types';
import { ExceptionRuleType } from '../types';
import { exceptionRuleManager } from '../services/ExceptionRuleManager';
import { useI18n } from '../i18n';
import { isDev } from '../utils/env';
import { ExceptionRuleCache } from '../utils/exceptionRuleCache';
import { getSafeErrorDetailFromUnknown } from '../utils/errorMessage';
import { useLayoutStability } from '../utils/LayoutStabilityMonitor';
import { logger } from '../utils/logger';
import { RuleSearchOptimizer, SearchResult } from '../utils/ruleSearchOptimizer';
import { RuleSelectionDialogView } from './RuleSelectionDialogView';

type ActionType = 'pause' | 'early_completion';

interface RuleSelectionDialogProps {
  isOpen: boolean;
  actionType: ActionType;
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
  onCancel,
}) => {
  const { language, tr } = useI18n();

  const [rules, setRules] = useState<ExceptionRule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | undefined>(15);
  const [isIndefinite, setIsIndefinite] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchOptimizer = useMemo(() => new RuleSearchOptimizer(), []);
  const ruleCache = useMemo(() => new ExceptionRuleCache(), []);
  const { startMonitoring, stopMonitoring } = useLayoutStability(containerRef);

  const createDefaultPresetRules = useCallback(
    async (chainId: string, action: ActionType): Promise<ExceptionRule[]> => {
      const defaultRuleNames =
        action === 'pause'
          ? language === 'zh'
            ? ['上厕所', '接电话']
            : ['Bathroom break', 'Phone call']
          : language === 'zh'
            ? ['提前达成目标']
            : ['Reached goal early'];

      const ruleType = action === 'pause' ? ExceptionRuleType.PAUSE_ONLY : ExceptionRuleType.EARLY_COMPLETION_ONLY;

      const createdRules: ExceptionRule[] = [];
      const allRules = await exceptionRuleManager.getAllRules();
      const chainRules = allRules.filter((rule) => rule.chainId === chainId && rule.scope === 'chain');

      for (const name of defaultRuleNames) {
        try {
          const existingRule = chainRules.find((rule) => rule.isActive && rule.name === name);
          if (existingRule) {
            createdRules.push(existingRule);
            continue;
          }

          const result = await exceptionRuleManager.createChainRule(chainId, name, ruleType);
          createdRules.push(result.rule);
        } catch (err) {
          logger.warn('RULE_SELECTION', `Failed to create default rule "${name}"`, { chainId, actionType: action }, err as Error);
        }
      }

      return createdRules;
    },
    [language]
  );

  const fetchChainRulesFromAPI = useCallback(
    async (chainId: string, action: ActionType): Promise<ExceptionRule[]> => {
      try {
        const allRules = await exceptionRuleManager.getAllRules();

        const applicableRules = allRules.filter((rule) => {
          const isChainRule = rule.chainId === chainId && rule.scope === 'chain';
          if (!isChainRule) return false;

          if (action === 'pause') return rule.type === ExceptionRuleType.PAUSE_ONLY;
          return rule.type === ExceptionRuleType.EARLY_COMPLETION_ONLY;
        });

        if (applicableRules.length === 0) {
          return await createDefaultPresetRules(chainId, action);
        }

        return applicableRules;
      } catch (err) {
        logger.error('RULE_SELECTION', '获取规则失败', { chainId, actionType: action }, err as Error);
        return createDefaultPresetRules(chainId, action);
      }
    },
    [createDefaultPresetRules]
  );

  const loadChainRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let chainRules = ruleCache.getChainRules(sessionContext.chainId);
      if (!chainRules) {
        chainRules = await fetchChainRulesFromAPI(sessionContext.chainId, actionType);
        ruleCache.setChainRules(sessionContext.chainId, chainRules);
      }

      setRules(chainRules);
    } catch (err) {
      const safe = getSafeErrorDetailFromUnknown(err, language);
      setError(safe ?? tr('加载规则失败', 'Failed to load rules'));
    } finally {
      setLoading(false);
    }
  }, [actionType, fetchChainRulesFromAPI, language, ruleCache, sessionContext.chainId, tr]);

  useEffect(() => {
    let focusTimer: ReturnType<typeof setTimeout> | undefined;

    if (isOpen) {
      startMonitoring();
      void loadChainRules();

      focusTimer = setTimeout(() => {
        const input = searchInputRef.current;
        if (!input) return;

        const active = document.activeElement;
        const shouldFocus = !active || active === document.body || active === document.documentElement;
        if (shouldFocus) {
          input.focus();
        }
      }, 100);
    } else {
      stopMonitoring();
      setSearchQuery('');
      setError(null);
    }

    return () => {
      if (focusTimer) clearTimeout(focusTimer);
      stopMonitoring();
    };
  }, [isOpen, loadChainRules, startMonitoring, stopMonitoring]);

  useEffect(() => {
    if (rules.length === 0) {
      setSearchResults([]);
      return;
    }

    searchOptimizer.updateIndex(rules);

    if (searchQuery.trim()) {
      searchOptimizer.searchRulesDebounced(rules, searchQuery, setSearchResults);
      return;
    }

    const sortedRules: SearchResult[] = [...rules]
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .map((rule) => ({
        rule,
        score: rule.usageCount || 0,
        matchType: 'exact' as const,
        highlightRanges: [],
      }));
    setSearchResults(sortedRules);
  }, [rules, searchQuery, searchOptimizer]);

  const handleRuleSelect = useCallback(
    async (rule: ExceptionRule) => {
      try {
        if (isDev) {
          logger.debug('RULE_SELECTION', '选择规则', { ruleId: rule.id, actionType });
        }

        const pauseOptions: PauseOptions | undefined =
          actionType === 'pause'
            ? isIndefinite
              ? { autoResume: false }
              : { duration: (duration ?? 15) * 60, autoResume: true }
            : undefined;

        onRuleSelected(rule, pauseOptions);
      } catch (err) {
        const safe = getSafeErrorDetailFromUnknown(err, language);
        setError(safe ?? tr('选择规则失败', 'Failed to select rule'));
      }
    },
    [actionType, duration, isIndefinite, language, onRuleSelected, tr]
  );

  const handleCreateNewRule = useCallback(
    async (inputName: string) => {
      const cleanName = inputName.trim();
      if (!cleanName) return;

      try {
        const ruleType = actionType === 'pause' ? ExceptionRuleType.PAUSE_ONLY : ExceptionRuleType.EARLY_COMPLETION_ONLY;

        const duplicateCheck = searchOptimizer.detectDuplicates(cleanName, rules);
        if (duplicateCheck.hasExactMatch) {
          setError(language === 'zh' ? `规则名称 "${cleanName}" 已存在` : `Rule name "${cleanName}" already exists`);
          return;
        }

        if (isDev) {
          logger.debug('RULE_SELECTION', '创建链专属规则', {
            cleanName,
            ruleType,
            actionType,
            chainId: sessionContext.chainId,
          });
        }

        const result = await exceptionRuleManager.createChainRule(sessionContext.chainId, cleanName, ruleType);

        ruleCache.addRuleToChain(sessionContext.chainId, result.rule);
        setRules(ruleCache.getChainRules(sessionContext.chainId) ?? []);
        setSearchQuery('');

        onCreateNewRule(cleanName, ruleType);
      } catch (err) {
        const safe = getSafeErrorDetailFromUnknown(err, language);
        setError(safe ?? tr('创建规则失败', 'Failed to create rule'));
      }
    },
    [actionType, language, onCreateNewRule, ruleCache, rules, searchOptimizer, sessionContext.chainId, tr]
  );

  if (!isOpen) return null;

  return (
    <RuleSelectionDialogView
      actionType={actionType}
      sessionContext={sessionContext}
      language={language}
      tr={tr}
      containerRef={containerRef}
      searchInputRef={searchInputRef}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      searchResults={searchResults}
      isLoading={loading}
      error={error}
      onDismissError={() => setError(null)}
      durationMinutes={duration}
      onDurationMinutesChange={setDuration}
      isIndefinite={isIndefinite}
      onIsIndefiniteChange={setIsIndefinite}
      onCancel={onCancel}
      onSelectRule={(rule) => void handleRuleSelect(rule)}
      onCreateNewRule={(name) => void handleCreateNewRule(name)}
    />
  );
};
