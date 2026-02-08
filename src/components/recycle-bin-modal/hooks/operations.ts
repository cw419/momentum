import type { Language } from '../../../i18n';
import { logger } from '../../../utils/logger';
import { toast } from '../../../utils/toast';
import { getSafeErrorDetailFromUnknown } from '../../../utils/errorMessage';
import { normalizeUnknownError } from '../../../utils/errors/normalizeError';
import type {
  AsyncOrSyncVoid,
  ConfirmDialogState,
  OperationResult,
} from '../types';

function isPartialRestoreFailureMessage(message: string) {
  return (
    message.includes('Partial restore failure') ||
    message.includes('部分链条恢复可能失败')
  );
}

async function performRestoreOperation(params: {
  chainIds: string[];
  onRestore: (chainIds: string[]) => AsyncOrSyncVoid;
  language: Language;
  tr: (zh: string, en: string) => string;
}): Promise<OperationResult> {
  const { chainIds, onRestore, language, tr } = params;

  const startTime = Date.now();
  try {
    await onRestore(chainIds);
    const duration = Date.now() - startTime;

    const result: OperationResult = {
      success: true,
      message: tr(
        `成功恢复 ${chainIds.length} 个链条（耗时 ${duration}ms）`,
        `Restored ${chainIds.length} chain(s) (took ${duration}ms)`,
      ),
      details: { count: chainIds.length, duration },
    };
    logger.debug('RECYCLE_BIN', 'Restore completed', result.details);
    return result;
  } catch (error) {
    const rawErrorMessage =
      error instanceof Error ? error.message : tr('未知错误', 'Unknown error');
    const safeDetail = getSafeErrorDetailFromUnknown(error, language);

    const defaultMessage = safeDetail
      ? tr(`恢复失败: ${safeDetail}`, `Restore failed: ${safeDetail}`)
      : tr(
          '恢复失败，请重试（详情见控制台）',
          'Restore failed. Check the console for details, then try again.',
        );

    const result: OperationResult = {
      success: false,
      message: defaultMessage,
      details: { error: rawErrorMessage, chainIds },
    };
    logger.error(
      'RECYCLE_BIN',
      'Restore operation failed',
      result.details,
      normalizeUnknownError(error),
    );

    if (isPartialRestoreFailureMessage(rawErrorMessage)) {
      result.message = tr(
        '部分链条恢复可能失败，请检查主界面确认结果。如有问题请刷新页面。',
        'Some chains may not have been restored. Please check the dashboard. If needed, refresh the page.',
      );
      toast.warning(result.message);
      return result;
    }

    toast.error(defaultMessage);
    return result;
  }
}

async function performPermanentDeleteOperation(params: {
  chainIds: string[];
  onPermanentDelete: (chainIds: string[]) => AsyncOrSyncVoid;
  language: Language;
  tr: (zh: string, en: string) => string;
}): Promise<OperationResult> {
  const { chainIds, onPermanentDelete, language, tr } = params;

  const startTime = Date.now();
  try {
    await onPermanentDelete(chainIds);
    const duration = Date.now() - startTime;

    const result: OperationResult = {
      success: true,
      message: tr(
        `成功永久删除 ${chainIds.length} 个链条（耗时 ${duration}ms）`,
        `Permanently deleted ${chainIds.length} chain(s) (took ${duration}ms)`,
      ),
      details: { count: chainIds.length, duration },
    };
    logger.debug('RECYCLE_BIN', 'Permanent delete completed', result.details);
    return result;
  } catch (error) {
    const rawErrorMessage =
      error instanceof Error ? error.message : tr('未知错误', 'Unknown error');
    const safeDetail = getSafeErrorDetailFromUnknown(error, language);

    const message = safeDetail
      ? tr(
          `永久删除失败: ${safeDetail}`,
          `Permanent delete failed: ${safeDetail}`,
        )
      : tr(
          '永久删除失败，请重试（详情见控制台）',
          'Permanent delete failed. Check the console for details, then try again.',
        );

    const result: OperationResult = {
      success: false,
      message,
      details: { error: rawErrorMessage, chainIds },
    };
    logger.error(
      'RECYCLE_BIN',
      'Permanent delete operation failed',
      result.details,
      normalizeUnknownError(error),
    );
    toast.error(message);
    return result;
  }
}

export async function performRecycleBinOperation(params: {
  dialog: ConfirmDialogState;
  onRestore: (chainIds: string[]) => AsyncOrSyncVoid;
  onPermanentDelete: (chainIds: string[]) => AsyncOrSyncVoid;
  language: Language;
  tr: (zh: string, en: string) => string;
}): Promise<OperationResult> {
  const { dialog, onRestore, onPermanentDelete, language, tr } = params;

  if (dialog.type === 'restore') {
    return performRestoreOperation({
      chainIds: dialog.chainIds,
      onRestore,
      language,
      tr,
    });
  }

  return performPermanentDeleteOperation({
    chainIds: dialog.chainIds,
    onPermanentDelete,
    language,
    tr,
  });
}
