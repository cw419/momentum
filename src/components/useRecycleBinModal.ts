/**
 * useRecycleBinModal hook
 * 封装 RecycleBinModal 的状态和业务逻辑
 */

import { useCallback, useEffect, useState } from 'react';
import type { DeletedChain } from '../types';
import { useStorage } from '../storage/useStorage';
import { useI18n } from '../i18n';
import { logger } from '../utils/logger';
import { toast } from '../utils/toast';
import { getSafeErrorDetailFromUnknown } from '../utils/errorMessage';

interface ConfirmDialogState {
  type: 'restore' | 'delete';
  chainIds: string[];
  chainNames: string[];
}

interface UseRecycleBinModalOptions {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (chainIds: string[]) => void;
  onPermanentDelete: (chainIds: string[]) => void;
}

export function useRecycleBinModal({
  isOpen,
  onClose,
  onRestore,
  onPermanentDelete
}: UseRecycleBinModalOptions) {
  const { language, tr } = useI18n();
  const storage = useStorage();

  // 状态
  const [deletedChains, setDeletedChains] = useState<DeletedChain[]>([]);
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<ConfirmDialogState | null>(null);

  // ESC 键关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !showConfirmDialog) {
      onClose();
    }
  }, [onClose, showConfirmDialog]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // 加载已删除的链条
  const loadDeletedChains = useCallback(async () => {
    setIsLoading(true);
    try {
      const chains = await storage.getDeletedChains();
      setDeletedChains(chains);
      setSelectedChains(new Set());
    } catch (error) {
      logger.error('RECYCLE_BIN', '加载已删除链条失败', undefined, error as Error);
      toast.error(tr('加载回收箱失败，请重试', 'Failed to load recycle bin. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  }, [storage, tr]);

  // 加载已删除的链条
  useEffect(() => {
    if (!isOpen) return;
    void loadDeletedChains();
  }, [isOpen, loadDeletedChains]);

  const handleSelectChain = useCallback((chainId: string, selected: boolean) => {
    setSelectedChains(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(chainId);
      } else {
        newSet.delete(chainId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedChains.size === deletedChains.length) {
      setSelectedChains(new Set());
    } else {
      setSelectedChains(new Set(deletedChains.map(chain => chain.id)));
    }
  }, [selectedChains.size, deletedChains]);

  const handleSingleRestore = useCallback((chainId: string) => {
    const chain = deletedChains.find(c => c.id === chainId);
    if (chain) {
      setShowConfirmDialog({
        type: 'restore',
        chainIds: [chainId],
        chainNames: [chain.name]
      });
    }
  }, [deletedChains]);

  const handleSinglePermanentDelete = useCallback((chainId: string) => {
    const chain = deletedChains.find(c => c.id === chainId);
    if (chain) {
      setShowConfirmDialog({
        type: 'delete',
        chainIds: [chainId],
        chainNames: [chain.name]
      });
    }
  }, [deletedChains]);

  const handleBulkRestore = useCallback(() => {
    if (selectedChains.size === 0) return;

    const chainNames = Array.from(selectedChains)
      .map(id => deletedChains.find(c => c.id === id)?.name)
      .filter(Boolean) as string[];

    setShowConfirmDialog({
      type: 'restore',
      chainIds: Array.from(selectedChains),
      chainNames
    });
  }, [selectedChains, deletedChains]);

  const handleBulkPermanentDelete = useCallback(() => {
    if (selectedChains.size === 0) return;

    const chainNames = Array.from(selectedChains)
      .map(id => deletedChains.find(c => c.id === id)?.name)
      .filter(Boolean) as string[];

    setShowConfirmDialog({
      type: 'delete',
      chainIds: Array.from(selectedChains),
      chainNames
    });
  }, [selectedChains, deletedChains]);

  const handleConfirmAction = useCallback(async () => {
    if (!showConfirmDialog) return;

    setIsLoading(true);
    try {
      logger.debug('RECYCLE_BIN', 'Starting operation', { type: showConfirmDialog.type, chainIds: showConfirmDialog.chainIds });

      const startTime = Date.now();
      let operationResult: { success: boolean; message: string; details?: Record<string, unknown> } = { success: false, message: '' };

      if (showConfirmDialog.type === 'restore') {
        try {
          await onRestore(showConfirmDialog.chainIds);
          const duration = Date.now() - startTime;
          operationResult = {
            success: true,
            message: tr(
              `成功恢复 ${showConfirmDialog.chainIds.length} 个链条（耗时 ${duration}ms）`,
              `Restored ${showConfirmDialog.chainIds.length} chain(s) (took ${duration}ms)`
            ),
            details: { count: showConfirmDialog.chainIds.length, duration }
          };
          logger.debug('RECYCLE_BIN', 'Restore completed', operationResult.details);
        } catch (error) {
          const rawErrorMessage = error instanceof Error ? error.message : tr('未知错误', 'Unknown error');
          const safeDetail = getSafeErrorDetailFromUnknown(error, language);
          operationResult = {
            success: false,
            message: safeDetail
              ? tr(`恢复操作失败: ${safeDetail}`, `Restore failed: ${safeDetail}`)
              : tr('恢复操作失败，请重试（详情见控制台）', 'Restore failed. Check the console for details, then try again.'),
            details: { error: rawErrorMessage, chainIds: showConfirmDialog.chainIds }
          };
          logger.error('RECYCLE_BIN', 'Restore operation failed', operationResult.details, error as Error);

          if (rawErrorMessage.includes('Partial restore failure') || rawErrorMessage.includes('部分链条恢复可能失败')) {
            operationResult.message = tr(
              '部分链条恢复可能失败，请检查主界面确认结果。如有问题请刷新页面。',
              'Some chains may not have been restored. Please check the dashboard. If needed, refresh the page.'
            );
            toast.warning(operationResult.message);
          } else {
            toast.error(
              safeDetail
                ? tr(`恢复失败: ${safeDetail}`, `Restore failed: ${safeDetail}`)
                : tr('恢复失败，请重试（详情见控制台）', 'Restore failed. Check the console for details, then try again.')
            );
          }
        }
      } else {
        try {
          await onPermanentDelete(showConfirmDialog.chainIds);
          const duration = Date.now() - startTime;
          operationResult = {
            success: true,
            message: tr(
              `成功永久删除 ${showConfirmDialog.chainIds.length} 个链条（耗时 ${duration}ms）`,
              `Permanently deleted ${showConfirmDialog.chainIds.length} chain(s) (took ${duration}ms)`
            ),
            details: { count: showConfirmDialog.chainIds.length, duration }
          };
          logger.debug('RECYCLE_BIN', 'Permanent delete completed', operationResult.details);
        } catch (error) {
          const rawErrorMessage = error instanceof Error ? error.message : tr('未知错误', 'Unknown error');
          const safeDetail = getSafeErrorDetailFromUnknown(error, language);
          operationResult = {
            success: false,
            message: safeDetail
              ? tr(`永久删除操作失败: ${safeDetail}`, `Permanent delete failed: ${safeDetail}`)
              : tr('永久删除操作失败，请重试（详情见控制台）', 'Permanent delete failed. Check the console for details, then try again.'),
            details: { error: rawErrorMessage, chainIds: showConfirmDialog.chainIds }
          };
          logger.error('RECYCLE_BIN', 'Permanent delete operation failed', operationResult.details, error as Error);
          toast.error(
            safeDetail
              ? tr(`永久删除失败: ${safeDetail}`, `Permanent delete failed: ${safeDetail}`)
              : tr('永久删除失败，请重试（详情见控制台）', 'Permanent delete failed. Check the console for details, then try again.')
          );
        }
      }

      logger.debug('RECYCLE_BIN', 'Refreshing local recycle bin data', { type: showConfirmDialog.type });
      await loadDeletedChains();
      logger.debug('RECYCLE_BIN', 'Local data refreshed successfully', { type: showConfirmDialog.type });

      if (operationResult.success) {
        toast.success(operationResult.message);
        logger.info('RECYCLE_BIN', 'Operation completed successfully', { type: showConfirmDialog.type, chainIds: showConfirmDialog.chainIds });
      }

    } catch (error) {
      logger.error('RECYCLE_BIN', 'Operation failed with unexpected error', { type: showConfirmDialog?.type }, error as Error);
      const safeDetail = getSafeErrorDetailFromUnknown(error, language);
      toast.error(
        safeDetail
          ? tr(`操作失败: ${safeDetail}`, `Operation failed: ${safeDetail}`)
          : tr('操作失败，请重试（详情见控制台）', 'Operation failed. Check the console for details, then try again.')
      );
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(null);
      setSelectedChains(new Set());
      logger.debug('RECYCLE_BIN', 'Operation cleanup completed, selections cleared');
    }
  }, [showConfirmDialog, onRestore, onPermanentDelete, loadDeletedChains, language, tr]);

  const handleCancelConfirm = useCallback(() => {
    setShowConfirmDialog(null);
  }, []);

  const formatDeletedTime = useCallback((deletedAt: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - deletedAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return language === 'zh' ? `${diffDays}天前` : `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else if (diffHours > 0) {
      return language === 'zh' ? `${diffHours}小时前` : `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffMinutes > 0) {
      return language === 'zh' ? `${diffMinutes}分钟前` : `${diffMinutes} min ago`;
    } else {
      return tr('刚刚', 'just now');
    }
  }, [language, tr]);

  return {
    // 状态
    deletedChains,
    selectedChains,
    isLoading,
    showConfirmDialog,

    // 国际化
    language,
    tr,

    // 工具函数
    formatDeletedTime,

    // 事件处理器
    handleSelectChain,
    handleSelectAll,
    handleSingleRestore,
    handleSinglePermanentDelete,
    handleBulkRestore,
    handleBulkPermanentDelete,
    handleConfirmAction,
    handleCancelConfirm
  };
}

export type { ConfirmDialogState };
