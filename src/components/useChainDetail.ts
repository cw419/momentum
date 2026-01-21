/**
 * useChainDetail hook
 * 封装 ChainDetail 的状态和业务逻辑
 */

import { useState, useCallback, useMemo } from 'react';
import type { Chain, CompletionHistory } from '../types';
import { useI18n } from '../i18n';

interface UseChainDetailOptions {
  chain: Chain;
  history: CompletionHistory[];
  onDelete: () => void;
}

export function useChainDetail({
  chain,
  history,
  onDelete
}: UseChainDetailOptions) {
  const { language, locale, tr } = useI18n();

  // 状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 计算值
  const chainHistory = useMemo(
    () => history.filter(h => h.chainId === chain.id),
    [history, chain.id]
  );

  const recentHistory = useMemo(
    () => chainHistory.slice(-10).reverse(),
    [chainHistory]
  );

  const successRate = useMemo(() => {
    if (chain.totalCompletions <= 0) return 0;
    return Math.round(
      (chain.totalCompletions / (chain.totalCompletions + chain.totalFailures)) * 100
    );
  }, [chain.totalCompletions, chain.totalFailures]);

  // 格式化失败原因
  const formatFailureReason = useCallback((reason: string): string => {
    if (reason === '用户主动中断') return tr('用户主动中断', 'Interrupted by user');
    if (reason === 'Interrupted by user') return tr('用户主动中断', 'Interrupted by user');
    return reason;
  }, [tr]);

  // 事件处理器
  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    onDelete();
    setShowDeleteConfirm(false);
  }, [onDelete]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  return {
    // 状态
    showDeleteConfirm,

    // 计算值
    chainHistory,
    recentHistory,
    successRate,
    chainHistoryCount: chainHistory.length,

    // 国际化
    language,
    locale,
    tr,

    // 工具函数
    formatFailureReason,

    // 事件处理器
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel
  };
}
