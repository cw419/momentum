import React from 'react';
import { ConfirmationDialog } from '../../ConfirmationDialog';
import type { ConfirmDialogState } from '../types';

interface ConfirmDialogProps {
  showConfirmDialog: ConfirmDialogState;
  tr: (zh: string, en: string) => string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  showConfirmDialog,
  tr,
  onConfirm,
  onCancel,
}) => (
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
            `Restore the following ${showConfirmDialog.chainIds.length} chain(s)?\n\n${showConfirmDialog.chainNames.join(', ')}`,
          )
        : tr(
            `确定要永久删除以下 ${showConfirmDialog.chainIds.length} 个链条吗？\n\n${showConfirmDialog.chainNames.join(', ')}\n\n⚠️ 此操作无法撤销，所有数据将被永久删除！`,
            `Permanently delete the following ${showConfirmDialog.chainIds.length} chain(s)?\n\n${showConfirmDialog.chainNames.join(', ')}\n\n⚠️ This cannot be undone. All data will be permanently deleted!`,
          )
    }
    confirmText={
      showConfirmDialog.type === 'restore'
        ? tr('恢复', 'Restore')
        : tr('永久删除', 'Delete permanently')
    }
    cancelText={tr('取消', 'Cancel')}
    confirmButtonClass={
      showConfirmDialog.type === 'restore'
        ? 'bg-green-500 hover:bg-green-600'
        : 'bg-red-500 hover:bg-red-600'
    }
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);
