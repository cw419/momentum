import type React from 'react';
import { Layers, Minus, Trash2 } from 'lucide-react';
import type { ChainTreeNode } from '../../../types';
import { Portal } from '../../Portal';

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
  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 overflow-y-auto">
        <div
          ref={deleteDialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="group-delete-dialog-title"
          aria-describedby="group-delete-dialog-description"
          className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full border border-gray-200/60 dark:border-slate-600/60 shadow-2xl animate-scale-in max-h-[calc(100vh-2rem)] overflow-y-auto"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <Layers className="text-red-500" size={24} aria-hidden="true" />
            </div>
            <h3
              id="group-delete-dialog-title"
              className="text-2xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-3"
            >
              {tr('确认删除任务群', 'Delete group?')}
            </h3>
            <p id="group-delete-dialog-description" className="text-gray-600 dark:text-slate-300 mb-6">
              {tr('你确定要删除任务群 "', 'Are you sure you want to delete the group "')}
              <span className="text-primary-500 font-semibold">{group.name}</span>
              {tr('" 吗？', '"?')}
            </p>
          </div>

          <div className="bg-red-50/80 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200/60 dark:border-red-800/40 mb-8">
            <div className="text-center mb-6">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium font-chinese">
                {tr(
                  '⚠️ 此操作将删除整个任务群及其所有子任务：',
                  '⚠️ This will delete the entire group and all its child tasks:',
                )}
              </p>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {group.children.map((child) => (
                <div key={child.id} className="text-red-600 dark:text-red-400 text-sm flex items-center space-x-2">
                  <Minus size={12} aria-hidden="true" />
                  <span className="font-chinese">{child.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              type="button"
              data-cancel-button
              onClick={(event) => {
                event.stopPropagation();
                onCancel();
              }}
              className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-6 py-4 rounded-2xl font-medium transition duration-300 hover:scale-105 font-chinese focus-ring"
            >
              {tr('取消', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onConfirm();
              }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-2xl font-medium transition duration-300 hover:scale-105 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl font-chinese focus-ring"
            >
              <Trash2 size={16} aria-hidden="true" />
              <span>{tr('确认删除', 'Delete')}</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

