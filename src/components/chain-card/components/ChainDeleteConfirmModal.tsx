import { Calendar, Flame, Settings, Trash2, TrendingUp } from 'lucide-react';
import type { Chain, ChainTreeNode } from '../../../types';
import { DeleteConfirmDialogShell } from '../../shared/DeleteConfirmDialogShell';

export function ChainDeleteConfirmModal({
  isOpen,
  chain,
  language: _language,
  tr,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  chain: Chain | ChainTreeNode;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const successRate =
    chain.totalCompletions > 0
      ? Math.round(
          (chain.totalCompletions /
            (chain.totalCompletions + chain.totalFailures)) *
            100,
        )
      : 0;

  return (
    <DeleteConfirmDialogShell
      isOpen={isOpen}
      titleId="delete-dialog-title"
      descriptionId="delete-dialog-description"
      headerIcon={
        <Trash2 size={24} className="text-red-500" aria-hidden="true" />
      }
      title={tr('Delete chain?', 'Delete chain?')}
      description={
        <>
          {tr(
            'Are you sure you want to delete the chain "',
            'Are you sure you want to delete the chain "',
          )}
          <span className="font-semibold text-primary-500">{chain.name}</span>
          {tr('"?', '"?')}
        </>
      }
      warningContent={
        <div className="mb-8 rounded-2xl border border-red-200/60 bg-red-50/80 p-6 dark:border-red-800/40 dark:bg-red-900/20">
          <div className="mb-6 text-center">
            <p className="font-chinese text-sm font-medium text-red-600 dark:text-red-400">
              {tr(
                'This will permanently delete:',
                'This will permanently delete:',
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-red-600 dark:text-red-400">
            <div className="rounded-xl border border-red-200/60 bg-white/80 p-4 dark:border-red-800/40 dark:bg-slate-700/50">
              <div className="mb-3 flex items-center font-chinese font-semibold">
                <Flame size={14} className="mr-2" />
                {tr('Main chain', 'Main chain')}
              </div>
              <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                <div>
                  {tr('Streak: ', 'Streak: ')}#{chain.currentStreak}
                </div>
                <div>
                  {tr('Completions: ', 'Completions: ')}
                  {chain.totalCompletions}
                </div>
                <div>
                  {tr('Failures: ', 'Failures: ')}
                  {chain.totalFailures}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-red-200/60 bg-white/80 p-4 dark:border-red-800/40 dark:bg-slate-700/50">
              <div className="mb-3 flex items-center font-chinese font-semibold">
                <Calendar size={14} className="mr-2" />
                {tr('Booking', 'Booking')}
              </div>
              <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                <div>
                  {tr('Streak: ', 'Streak: ')}#{chain.auxiliaryStreak}
                </div>
                <div>
                  {tr('Failures: ', 'Failures: ')}
                  {chain.auxiliaryFailures}
                </div>
                <div>
                  {tr('Exceptions: ', 'Exceptions: ')}
                  {chain.auxiliaryExceptions?.length || 0}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-red-600 dark:text-red-400">
            <div className="rounded-xl border border-red-200/60 bg-white/80 p-4 dark:border-red-800/40 dark:bg-slate-700/50">
              <div className="mb-3 flex items-center font-chinese font-semibold">
                <TrendingUp size={14} className="mr-2" />
                {tr('History', 'History')}
              </div>
              <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                <div>
                  {tr('Completions: ', 'Completions: ')}
                  {chain.totalCompletions}
                </div>
                <div>
                  {tr('Failures: ', 'Failures: ')}
                  {chain.totalFailures}
                </div>
                <div>
                  {tr('Success rate: ', 'Success rate: ')}
                  {successRate}%
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-red-200/60 bg-white/80 p-4 dark:border-red-800/40 dark:bg-slate-700/50">
              <div className="mb-3 flex items-center font-chinese font-semibold">
                <Settings size={14} className="mr-2" />
                {tr('Rules', 'Rules')}
              </div>
              <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                <div>
                  {tr('Exceptions: ', 'Exceptions: ')}
                  {chain.exceptions.length}
                </div>
                <div>
                  {tr('Booking exceptions: ', 'Booking exceptions: ')}
                  {chain.auxiliaryExceptions?.length || 0}
                </div>
                <div>{tr('All settings', 'All settings')}</div>
              </div>
            </div>
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
