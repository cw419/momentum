import type React from 'react';
import { Calendar, Flame, Settings, Trash2, TrendingUp } from 'lucide-react';
import type { Chain, ChainTreeNode } from '../../../types';
import { Portal } from '../../Portal';

export function ChainDeleteConfirmModal({
  isOpen,
  chain,
  language,
  tr,
  deleteDialogRef,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  chain: Chain | ChainTreeNode;
  language: 'zh' | 'en';
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
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
          className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full border border-gray-200/60 dark:border-slate-600/60 shadow-2xl animate-scale-in max-h-[calc(100vh-2rem)] overflow-y-auto"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <Trash2 size={24} className="text-red-500" aria-hidden="true" />
            </div>
            <h3
              id="delete-dialog-title"
              className="text-2xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-3"
            >
              {tr('确认删除链条', 'Delete chain?')}
            </h3>
            <p id="delete-dialog-description" className="text-gray-600 dark:text-slate-300 mb-6">
              {tr('你确定要删除链条 "', 'Are you sure you want to delete the chain "')}
              <span className="text-primary-500 font-semibold">{chain.name}</span>
              {tr('" 吗？', '"?')}
            </p>
          </div>

          <div className="bg-red-50/80 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200/60 dark:border-red-800/40 mb-8">
            <div className="text-center mb-6">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium font-chinese">
                {tr('⚠️ 此操作将永久删除以下数据：', '⚠️ This will permanently delete:')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-red-600 dark:text-red-400 text-sm">
              <div className="bg-white/80 dark:bg-slate-700/50 rounded-xl p-4 border border-red-200/60 dark:border-red-800/40">
                <div className="font-semibold mb-3 flex items-center font-chinese">
                  <Flame size={14} className="mr-2" />
                  {tr('主链数据', 'Main chain')}
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                  <div>
                    {tr('记录: ', 'Streak: ')}#{chain.currentStreak}
                  </div>
                  <div>
                    {tr('完成: ', 'Completions: ')}
                    {chain.totalCompletions}
                  </div>
                  <div>
                    {tr('失败: ', 'Failures: ')}
                    {chain.totalFailures}
                  </div>
                </div>
              </div>
              <div className="bg-white/80 dark:bg-slate-700/50 rounded-xl p-4 border border-red-200/60 dark:border-red-800/40">
                <div className="font-semibold mb-3 flex items-center font-chinese">
                  <Calendar size={14} className="mr-2" />
                  {tr('预约链数据', 'Booking')}
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                  <div>
                    {tr('记录: ', 'Streak: ')}#{chain.auxiliaryStreak}
                  </div>
                  <div>
                    {tr('失败: ', 'Failures: ')}
                    {chain.auxiliaryFailures}
                  </div>
                  <div>
                    {tr('例外: ', 'Exceptions: ')}
                    {chain.auxiliaryExceptions?.length || 0}
                    {language === 'zh' ? ' 条' : ''}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-red-600 dark:text-red-400 text-sm mt-4">
              <div className="bg-white/80 dark:bg-slate-700/50 rounded-xl p-4 border border-red-200/60 dark:border-red-800/40">
                <div className="font-semibold mb-3 flex items-center font-chinese">
                  <TrendingUp size={14} className="mr-2" />
                  {tr('历史记录', 'History')}
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                  <div>
                    {tr('完成记录: ', 'Completions: ')}
                    {chain.totalCompletions}
                    {language === 'zh' ? ' 次' : ''}
                  </div>
                  <div>
                    {tr('失败记录: ', 'Failures: ')}
                    {chain.totalFailures}
                    {language === 'zh' ? ' 次' : ''}
                  </div>
                  <div>
                    {tr('成功率: ', 'Success rate: ')}
                    {chain.totalCompletions > 0
                      ? Math.round((chain.totalCompletions / (chain.totalCompletions + chain.totalFailures)) * 100)
                      : 0}
                    %
                  </div>
                </div>
              </div>
              <div className="bg-white/80 dark:bg-slate-700/50 rounded-xl p-4 border border-red-200/60 dark:border-red-800/40">
                <div className="font-semibold mb-3 flex items-center font-chinese">
                  <Settings size={14} className="mr-2" />
                  {tr('规则设置', 'Rules')}
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                  <div>
                    {tr('例外: ', 'Exceptions: ')}
                    {chain.exceptions.length}
                    {language === 'zh' ? ' 条' : ''}
                  </div>
                  <div>
                    {tr('预约例外: ', 'Booking exceptions: ')}
                    {chain.auxiliaryExceptions?.length || 0}
                    {language === 'zh' ? ' 条' : ''}
                  </div>
                  <div>{tr('所有配置', 'All settings')}</div>
                </div>
              </div>
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

