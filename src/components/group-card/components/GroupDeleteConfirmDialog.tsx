import type React from 'react';
import { Layers, Minus } from 'lucide-react';
import type { ChainTreeNode } from '../../../types';
import { DeleteConfirmDialogShell } from '../../shared/DeleteConfirmDialogShell';

export function GroupDeleteConfirmDialog({
  isOpen,
  group,
  tr,
  deleteDialogRef,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  group: ChainTreeNode;
  tr: (zh: string, en: string) => string;
  deleteDialogRef: React.RefObject<HTMLDivElement>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <DeleteConfirmDialogShell
      isOpen={isOpen}
      dialogRef={deleteDialogRef}
      titleId="group-delete-dialog-title"
      descriptionId="group-delete-dialog-description"
      headerIcon={
        <Layers className="text-red-500" size={24} aria-hidden="true" />
      }
      title={tr('Delete group?', 'Delete group?')}
      description={
        <>
          {tr(
            'Are you sure you want to delete the group "',
            'Are you sure you want to delete the group "',
          )}
          <span className="font-semibold text-primary-500">{group.name}</span>
          {tr('"?', '"?')}
        </>
      }
      warningContent={
        <div className="mb-8 rounded-2xl border border-red-200/60 bg-red-50/80 p-6 dark:border-red-800/40 dark:bg-red-900/20">
          <div className="mb-6 text-center">
            <p className="font-chinese text-sm font-medium text-red-600 dark:text-red-400">
              {tr(
                'This will delete the entire group and all child tasks:',
                'This will delete the entire group and all child tasks:',
              )}
            </p>
          </div>
          <div className="max-h-32 space-y-2 overflow-y-auto">
            {group.children.map((child) => (
              <div
                key={child.id}
                className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400"
              >
                <Minus size={12} aria-hidden="true" />
                <span className="font-chinese">{child.name}</span>
              </div>
            ))}
          </div>
        </div>
      }
      cancelLabel={tr('Cancel', 'Cancel')}
      confirmLabel={tr('Delete', 'Delete')}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
