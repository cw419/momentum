import React, { useState, useEffect } from 'react';
import { DeletedChain } from '../types';
import { useStorage } from '../storage/StorageContext';
import { DeletedChainCard } from './DeletedChainCard';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Trash2, RotateCcw, X, CheckSquare, Square } from 'lucide-react';
import { logger } from '../utils/logger';
import { toast } from '../utils/toast';
import { useI18n } from '../i18n';
import { getSafeErrorDetail } from '../utils/errorMessage';

interface RecycleBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (chainIds: string[]) => void;
  onPermanentDelete: (chainIds: string[]) => void;
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({
  isOpen,
  onClose,
  onRestore,
  onPermanentDelete,
}) => {
  const { language, tr } = useI18n();
  const storage = useStorage();
  const [deletedChains, setDeletedChains] = useState<DeletedChain[]>([]);
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    type: 'restore' | 'delete';
    chainIds: string[];
    chainNames: string[];
  } | null>(null);

  // 加载已删除的链条
  useEffect(() => {
    if (isOpen) {
      loadDeletedChains();
    }
  }, [isOpen]);

  const loadDeletedChains = async () => {
    setIsLoading(true);
    try {
      const chains = await storage.getDeletedChains();
      setDeletedChains(chains);
      setSelectedChains(new Set()); // 清空选择
    } catch (error) {
      logger.error('RECYCLE_BIN', '加载已删除链条失败', undefined, error as Error);
      toast.error(tr('加载回收箱失败，请重试', 'Failed to load recycle bin. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChain = (chainId: string, selected: boolean) => {
    setSelectedChains(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(chainId);
      } else {
        newSet.delete(chainId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedChains.size === deletedChains.length) {
      setSelectedChains(new Set());
    } else {
      setSelectedChains(new Set(deletedChains.map(chain => chain.id)));
    }
  };

  const handleSingleRestore = (chainId: string) => {
    const chain = deletedChains.find(c => c.id === chainId);
    if (chain) {
      setShowConfirmDialog({
        type: 'restore',
        chainIds: [chainId],
        chainNames: [chain.name]
      });
    }
  };

  const handleSinglePermanentDelete = (chainId: string) => {
    const chain = deletedChains.find(c => c.id === chainId);
    if (chain) {
      setShowConfirmDialog({
        type: 'delete',
        chainIds: [chainId],
        chainNames: [chain.name]
      });
    }
  };

  const handleBulkRestore = () => {
    if (selectedChains.size === 0) return;
    
    const chainNames = Array.from(selectedChains)
      .map(id => deletedChains.find(c => c.id === id)?.name)
      .filter(Boolean) as string[];
    
    setShowConfirmDialog({
      type: 'restore',
      chainIds: Array.from(selectedChains),
      chainNames
    });
  };

  const handleBulkPermanentDelete = () => {
    if (selectedChains.size === 0) return;
    
    const chainNames = Array.from(selectedChains)
      .map(id => deletedChains.find(c => c.id === id)?.name)
      .filter(Boolean) as string[];
    
    setShowConfirmDialog({
      type: 'delete',
      chainIds: Array.from(selectedChains),
      chainNames
    });
  };

  const handleConfirmAction = async () => {
    if (!showConfirmDialog) return;
    
    setIsLoading(true);
    try {
      logger.debug('RECYCLE_BIN', 'Starting operation', { type: showConfirmDialog.type, chainIds: showConfirmDialog.chainIds });
      
      const startTime = Date.now();
      let operationResult: { success: boolean; message: string; details?: any } = { success: false, message: '' };
      
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
          const safeDetail = error instanceof Error ? getSafeErrorDetail(error.message, language) : null;
          operationResult = {
            success: false,
            message: safeDetail
              ? tr(`恢复操作失败: ${safeDetail}`, `Restore failed: ${safeDetail}`)
              : tr('恢复操作失败，请重试（详情见控制台）', 'Restore failed. Check the console for details, then try again.'),
            details: { error: rawErrorMessage, chainIds: showConfirmDialog.chainIds }
          };
          logger.error('RECYCLE_BIN', 'Restore operation failed', operationResult.details, error as Error);
          
          // ENHANCED: Handle partial failures more gracefully
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
          const safeDetail = error instanceof Error ? getSafeErrorDetail(error.message, language) : null;
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
      
      // ENHANCED: Force reload local data after parent callbacks complete
      logger.debug('RECYCLE_BIN', 'Refreshing local recycle bin data', { type: showConfirmDialog.type });
      await loadDeletedChains();
      logger.debug('RECYCLE_BIN', 'Local data refreshed successfully', { type: showConfirmDialog.type });
      
      // ENHANCED: Show success message for successful operations
      if (operationResult.success) {
        toast.success(operationResult.message);
        
        logger.info('RECYCLE_BIN', 'Operation completed successfully', { type: showConfirmDialog.type, chainIds: showConfirmDialog.chainIds });
      }
      
    } catch (error) {
      logger.error('RECYCLE_BIN', 'Operation failed with unexpected error', { type: showConfirmDialog?.type }, error as Error);
      const safeDetail = error instanceof Error ? getSafeErrorDetail(error.message, language) : null;
      toast.error(
        safeDetail
          ? tr(`操作失败: ${safeDetail}`, `Operation failed: ${safeDetail}`)
          : tr('操作失败，请重试（详情见控制台）', 'Operation failed. Check the console for details, then try again.')
      );
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(null);
      
      // ENHANCED: Clear selections after operation
      setSelectedChains(new Set());
      logger.debug('RECYCLE_BIN', 'Operation cleanup completed, selections cleared');
    }
  };

  const formatDeletedTime = (deletedAt: Date) => {
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
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-gray-200 dark:border-slate-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
              <Trash2 size={20} className="text-gray-600 dark:text-slate-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100">
                {tr('回收箱', 'Recycle bin')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 font-mono">
                {language === 'zh'
                  ? `回收箱 • ${deletedChains.length} 项`
                  : `RECYCLE BIN • ${deletedChains.length} ITEM${deletedChains.length === 1 ? '' : 'S'}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-600 dark:text-slate-400 font-chinese">{tr('正在加载…', 'Loading…')}</p>
              </div>
            </div>
          ) : deletedChains.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={32} className="text-gray-400 dark:text-slate-500" />
                </div>
                <h3 className="text-xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-2">
                  {tr('回收箱为空', 'Recycle bin is empty')}
                </h3>
                <p className="text-gray-600 dark:text-slate-400 leading-relaxed">
                  {tr(
                    '删除的链条会出现在这里，你可以选择恢复或永久删除它们。',
                    'Deleted chains appear here. You can restore them or delete them permanently.'
                  )}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Bulk Actions Bar */}
              {deletedChains.length > 0 && (
                <div className="p-6 border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors"
                      >
                        {selectedChains.size === deletedChains.length ? (
                          <CheckSquare size={16} />
                        ) : (
                          <Square size={16} />
                        )}
                        <span>
                          {selectedChains.size === deletedChains.length
                            ? tr('取消全选', 'Clear selection')
                            : tr('全选', 'Select all')}
                        </span>
                      </button>
                      {selectedChains.size > 0 && (
                        <span className="text-sm text-gray-500 dark:text-slate-400">
                          {language === 'zh' ? `已选择 ${selectedChains.size} 项` : `${selectedChains.size} selected`}
                        </span>
                      )}
                    </div>
                    
                    {selectedChains.size > 0 && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleBulkRestore}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors text-sm font-medium"
                        >
                          <RotateCcw size={16} />
                          <span>{tr('批量恢复', 'Restore selected')}</span>
                        </button>
                        <button
                          onClick={handleBulkPermanentDelete}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors text-sm font-medium"
                        >
                          <Trash2 size={16} />
                          <span>{tr('永久删除', 'Delete permanently')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Chains List */}
              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {deletedChains.map(chain => (
                    <DeletedChainCard
                      key={chain.id}
                      chain={chain}
                      isSelected={selectedChains.has(chain.id)}
                      onSelect={handleSelectChain}
                      onRestore={handleSingleRestore}
                      onPermanentDelete={handleSinglePermanentDelete}
                      deletedTimeText={formatDeletedTime(chain.deletedAt)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <ConfirmationDialog
          isOpen={true}
          title={
            showConfirmDialog.type === 'restore'
              ? tr('确认恢复', 'Confirm restore')
              : tr('确认永久删除', 'Confirm permanent deletion')
          }
          message={
            showConfirmDialog.type === 'restore'
              ? tr(
                `确定要恢复以下 ${showConfirmDialog.chainIds.length} 个链条吗？\n\n${showConfirmDialog.chainNames.join(', ')}`,
                `Restore the following ${showConfirmDialog.chainIds.length} chain(s)?\n\n${showConfirmDialog.chainNames.join(', ')}`
              )
              : tr(
                `确定要永久删除以下 ${showConfirmDialog.chainIds.length} 个链条吗？\n\n${showConfirmDialog.chainNames.join(', ')}\n\n⚠️ 此操作无法撤销，所有数据将被永久删除！`,
                `Permanently delete the following ${showConfirmDialog.chainIds.length} chain(s)?\n\n${showConfirmDialog.chainNames.join(', ')}\n\n⚠️ This cannot be undone. All data will be permanently deleted!`
              )
          }
          confirmText={showConfirmDialog.type === 'restore' ? tr('恢复', 'Restore') : tr('永久删除', 'Delete permanently')}
          cancelText={tr('取消', 'Cancel')}
          confirmButtonClass={
            showConfirmDialog.type === 'restore'
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-red-500 hover:bg-red-600'
          }
          onConfirm={handleConfirmAction}
          onCancel={() => setShowConfirmDialog(null)}
        />
      )}
    </div>
  );
};
