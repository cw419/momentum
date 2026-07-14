import { useCallback, useEffect, useRef, useState } from 'react';
import type { DeletedChain } from '../../../types';
import { useStorage } from '../../../storage/useStorage';
import { useI18n } from '../../../i18n';
import { logger } from '../../../utils/logger';
import { toast } from '../../../utils/toast';
import { getSafeErrorDetailFromUnknown } from '../../../utils/errorMessage';
import { normalizeUnknownError } from '../../../utils/errors/normalizeError';
import type { AsyncOrSyncVoid, ConfirmDialogState } from '../types';
import { performRecycleBinOperation } from './operations';
import { formatDeletedTime } from './timeFormat';

interface UseRecycleBinModalOptions {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (chainIds: string[]) => AsyncOrSyncVoid;
  onPermanentDelete: (chainIds: string[]) => AsyncOrSyncVoid;
}

export function useRecycleBinModal({
  isOpen,
  onRestore,
  onPermanentDelete,
}: UseRecycleBinModalOptions) {
  const { language, tr } = useI18n();
  const storage = useStorage();

  const [deletedChains, setDeletedChains] = useState<DeletedChain[]>([]);
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] =
    useState<ConfirmDialogState | null>(null);
  const loadRequestIdRef = useRef(0);
  const operationInFlightRef = useRef(false);

  const loadDeletedChains = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    setIsLoading(true);
    try {
      const chains = await storage.getDeletedChains();
      if (requestId !== loadRequestIdRef.current) return;
      setDeletedChains(chains);
      setSelectedChains(new Set());
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) return;
      logger.error(
        'RECYCLE_BIN',
        '加载已删除链条失败',
        undefined,
        normalizeUnknownError(error),
      );
      toast.error(
        tr(
          '加载回收箱失败，请重试',
          'Failed to load recycle bin. Please try again.',
        ),
      );
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [storage, tr]);

  useEffect(() => {
    if (!isOpen) {
      loadRequestIdRef.current += 1;
      setIsLoading(false);
      return;
    }
    void loadDeletedChains();
    return () => {
      loadRequestIdRef.current += 1;
    };
  }, [isOpen, loadDeletedChains]);

  const handleSelectChain = useCallback(
    (chainId: string, selected: boolean) => {
      setSelectedChains((prev) => {
        const next = new Set(prev);
        if (selected) {
          next.add(chainId);
        } else {
          next.delete(chainId);
        }
        return next;
      });
    },
    [],
  );

  const handleSelectAll = useCallback(() => {
    if (selectedChains.size === deletedChains.length) {
      setSelectedChains(new Set());
    } else {
      setSelectedChains(new Set(deletedChains.map((chain) => chain.id)));
    }
  }, [selectedChains.size, deletedChains]);

  const handleSingleRestore = useCallback(
    (chainId: string) => {
      const chain = deletedChains.find((c) => c.id === chainId);
      if (chain) {
        setShowConfirmDialog({
          type: 'restore',
          chainIds: [chainId],
          chainNames: [chain.name],
        });
      }
    },
    [deletedChains],
  );

  const handleSinglePermanentDelete = useCallback(
    (chainId: string) => {
      const chain = deletedChains.find((c) => c.id === chainId);
      if (chain) {
        setShowConfirmDialog({
          type: 'delete',
          chainIds: [chainId],
          chainNames: [chain.name],
        });
      }
    },
    [deletedChains],
  );

  const handleBulkRestore = useCallback(() => {
    if (selectedChains.size === 0) return;

    const chainNames = Array.from(selectedChains)
      .map((id) => deletedChains.find((c) => c.id === id)?.name)
      .filter(Boolean) as string[];

    setShowConfirmDialog({
      type: 'restore',
      chainIds: Array.from(selectedChains),
      chainNames,
    });
  }, [selectedChains, deletedChains]);

  const handleBulkPermanentDelete = useCallback(() => {
    if (selectedChains.size === 0) return;

    const chainNames = Array.from(selectedChains)
      .map((id) => deletedChains.find((c) => c.id === id)?.name)
      .filter(Boolean) as string[];

    setShowConfirmDialog({
      type: 'delete',
      chainIds: Array.from(selectedChains),
      chainNames,
    });
  }, [selectedChains, deletedChains]);

  const handleConfirmAction = useCallback(async () => {
    if (!showConfirmDialog || operationInFlightRef.current) return;

    operationInFlightRef.current = true;
    setIsLoading(true);
    try {
      const dialog = showConfirmDialog;
      logger.debug('RECYCLE_BIN', 'Starting operation', {
        type: dialog.type,
        chainIds: dialog.chainIds,
      });

      const operationResult = await performRecycleBinOperation({
        dialog,
        onRestore,
        onPermanentDelete,
        language,
        tr,
      });

      logger.debug('RECYCLE_BIN', 'Refreshing local recycle bin data', {
        type: dialog.type,
      });
      await loadDeletedChains();
      logger.debug('RECYCLE_BIN', 'Local data refreshed successfully', {
        type: dialog.type,
      });

      if (operationResult.success) {
        toast.success(operationResult.message);
        logger.info('RECYCLE_BIN', 'Operation completed successfully', {
          type: dialog.type,
          chainIds: dialog.chainIds,
        });
      }
    } catch (error) {
      logger.error(
        'RECYCLE_BIN',
        'Operation failed with unexpected error',
        { type: showConfirmDialog?.type },
        normalizeUnknownError(error),
      );
      const safeDetail = getSafeErrorDetailFromUnknown(error, language);
      toast.error(
        safeDetail
          ? tr(`操作失败: ${safeDetail}`, `Operation failed: ${safeDetail}`)
          : tr(
              '操作失败，请重试（详情见控制台）',
              'Operation failed. Check the console for details, then try again.',
            ),
      );
    } finally {
      operationInFlightRef.current = false;
      setIsLoading(false);
      setShowConfirmDialog(null);
      setSelectedChains(new Set());
      logger.debug(
        'RECYCLE_BIN',
        'Operation cleanup completed, selections cleared',
      );
    }
  }, [
    showConfirmDialog,
    onPermanentDelete,
    onRestore,
    loadDeletedChains,
    language,
    tr,
  ]);

  const handleCancelConfirm = useCallback(() => {
    setShowConfirmDialog(null);
  }, []);

  const formatDeletedTimeForDisplay = useCallback(
    (deletedAt: Date) => formatDeletedTime({ deletedAt, language, tr }),
    [language, tr],
  );

  return {
    deletedChains,
    selectedChains,
    isLoading,
    showConfirmDialog,
    language,
    tr,
    formatDeletedTime: formatDeletedTimeForDisplay,
    handleSelectChain,
    handleSelectAll,
    handleSingleRestore,
    handleSinglePermanentDelete,
    handleBulkRestore,
    handleBulkPermanentDelete,
    handleConfirmAction,
    handleCancelConfirm,
  };
}

export type { ConfirmDialogState } from '../types';
