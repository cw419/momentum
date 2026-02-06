/**
 * ChainCardView - 纯展示组件
 * 负责 ChainCard 的所有 UI 渲染，不包含任何业务逻辑
 */

import React from 'react';
import { Play, Clock, MoreHorizontal, Trash2, Flame, Calendar, Bell, Check, AlertTriangle } from 'lucide-react';
import { formatDuration, formatTime, formatTimeDescriptionByLanguage } from '../../utils/time';
import { Icon } from '../../utils/iconMap';
import { getAuxiliarySignalLabel, getTriggerLabel } from '../chain-editor/constants';
import type { ChainCardViewProps } from './types';
import { ChainDeleteConfirmModal } from './components/ChainDeleteConfirmModal';

export const ChainCardView: React.FC<ChainCardViewProps> = React.memo(({
  chain,
  typeConfig,
  language,
  tr,
  timeRemaining,
  isScheduled,
  showMenu,
  showDeleteConfirm,
  lastCompletionTime,
  scheduledSession,
  onViewDetail,
  onStartChain,
  onScheduleChain,
  onCompleteBooking,
  onCancelScheduledSession,
  onToggleMenu,
  onShowDeleteConfirm,
  onConfirmDelete,
  onCancelDelete,
  deleteDialogRef,
}) => {
  let durationText: string;
  if (chain.isDurationless || chain.duration === 0) {
    if (lastCompletionTime) {
      durationText = `${tr('上次：', 'Last: ')}${formatTimeDescriptionByLanguage(lastCompletionTime, language)}`;
    } else {
      durationText = tr('首次执行', 'First time');
    }
  } else {
    durationText = formatTime(chain.duration, language);
  }

  const completionUnit = chain.totalCompletions === 1 ? 'completion' : 'completions';
  const completionsText = language === 'zh'
    ? `${chain.totalCompletions} 次完成`
    : `${chain.totalCompletions} ${completionUnit}`;

  return (
    <div className="relative">
      <div
        className="bento-card cursor-pointer group animate-scale-in"
        onClick={onViewDetail}
        role="button"
        tabIndex={0}
        aria-label={tr(`查看详情：${chain.name}`, `View details: ${chain.name}`)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onViewDetail();
          }
        }}
      >
        {/* Menu button */}
        <div className="absolute top-6 right-6">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
            aria-label={tr('更多选项', 'More options')}
            aria-expanded={showMenu ? 'true' : 'false'}
            className="p-3 min-w-[44px] min-h-[44px] text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 focus-ring"
          >
            <MoreHorizontal size={16} aria-hidden="true" />
          </button>

          {showMenu && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShowDeleteConfirm();
              }}
              aria-label={tr('删除链条', 'Delete chain')}
              className="absolute right-0 top-12 w-14 h-14 bg-white dark:bg-slate-800 rounded-xl shadow-xl dark:shadow-2xl border border-gray-200 dark:border-slate-600 z-10 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-colors"
            >
              <Trash2 size={22} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-8 h-8 rounded-xl ${typeConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                <Icon name={typeConfig.icon} size={14} className={typeConfig.color} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100 group-hover:text-primary-500 transition-colors truncate">
                  {chain.name}
                </h3>
                {chain.type !== 'unit' && (
                  <p className="text-xs font-mono text-gray-500 tracking-wide truncate">
                    {typeConfig.name}
                  </p>
                )}
              </div>
            </div>
            <p className="text-gray-600 dark:text-slate-400 text-sm mb-3 font-mono tracking-wide truncate">
              {getTriggerLabel(chain.trigger, language)}
            </p>
            <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed line-clamp-2">
              {chain.description}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 dark:from-primary-500/20 dark:to-primary-600/10 border border-primary-200/50 dark:border-primary-400/30">
            <div className="flex items-center justify-center space-x-2 text-primary-500 mb-2">
              <Flame size={18} />
              <span className="text-3xl font-bold font-mono">#{chain.currentStreak}</span>
            </div>
            <div className="text-xs font-chinese text-gray-600 dark:text-slate-400 font-medium">
              {tr('主链记录', 'Main streak')}
            </div>
          </div>
          <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10 border border-blue-200/50 dark:border-blue-400/30">
            <div className="flex items-center justify-center space-x-2 text-blue-500 mb-2">
              <Calendar size={18} />
              <span className="text-3xl font-bold font-mono">#{chain.auxiliaryStreak}</span>
            </div>
            <div className="text-xs font-chinese text-gray-600 dark:text-slate-400 font-medium">
              {tr('预约链记录', 'Booking streak')}
            </div>
          </div>
        </div>

        {/* Duration and completions */}
        <div className="flex items-center justify-between mb-6 p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center space-x-2 text-gray-700 dark:text-slate-300">
            <Clock size={16} />
            <span className="font-medium">
              {durationText}
            </span>
          </div>
          <div className="text-gray-600 dark:text-slate-400 text-sm font-mono">
            {completionsText}
          </div>
        </div>

        {/* Scheduled session */}
        {isScheduled && scheduledSession && (
          <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10 rounded-2xl p-4 mb-6 border border-blue-200/50 dark:border-blue-400/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-blue-600 min-w-0 flex-1 mr-2">
                <Bell size={14} className="flex-shrink-0" />
                <span className="text-sm font-chinese font-medium truncate">
                  {tr('预约信号: ', 'Signal: ')}
                  {getAuxiliarySignalLabel(scheduledSession.auxiliarySignal, language)}
                </span>
              </div>
              <div className="text-blue-700 dark:text-blue-400 font-mono font-bold text-lg flex-shrink-0">
                {formatDuration(timeRemaining)}
              </div>
            </div>
            <div className="text-blue-600 dark:text-blue-400 text-xs mb-3 font-chinese truncate">
              {tr('请在时间结束前完成: ', 'Complete before time runs out: ')}
              {getTriggerLabel(chain.auxiliaryCompletionTrigger, language)}
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCompleteBooking();
                }}
                className="flex-1 bg-green-500/10 hover:bg-green-500/20 dark:bg-green-500/20 dark:hover:bg-green-500/30 text-green-600 dark:text-green-400 px-3 py-3 rounded-xl text-sm transition-colors duration-200 flex items-center justify-center space-x-2 border border-green-200/50 dark:border-green-400/30"
              >
                <Check size={14} />
                <span className="font-chinese font-medium">{tr('完成预约', 'Complete booking')}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelScheduledSession();
                }}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 dark:bg-red-500/20 dark:hover:bg-red-500/30 text-red-600 dark:text-red-400 px-3 py-3 rounded-xl text-sm transition-colors duration-200 flex items-center justify-center space-x-2 border border-red-200/50 dark:border-red-400/30"
              >
                <AlertTriangle size={14} />
                <span className="font-chinese font-medium">{tr('中断/规则判定', 'Interrupt / Adjudicate')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartChain();
            }}
            className="flex-1 gradient-primary hover:shadow-xl text-white px-4 py-3 rounded-2xl font-medium transition duration-300 flex items-center justify-center space-x-2 hover:scale-105 shadow-lg focus-ring"
          >
            <Play size={16} aria-hidden="true" />
            <span className="font-chinese font-semibold">{tr('开始任务', 'Start')}</span>
          </button>

          {!isScheduled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onScheduleChain();
              }}
              className="flex-1 gradient-dark hover:shadow-xl text-white px-4 py-3 rounded-2xl font-medium transition duration-300 flex items-center justify-center space-x-2 hover:scale-105 shadow-lg focus-ring"
            >
              <Clock size={16} aria-hidden="true" />
              <span className="font-chinese font-semibold">{tr('预约', 'Schedule')}</span>
            </button>
          )}
        </div>
      </div>

      <ChainDeleteConfirmModal
        isOpen={showDeleteConfirm}
        chain={chain}
        language={language}
        tr={tr}
        deleteDialogRef={deleteDialogRef}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
});

ChainCardView.displayName = 'ChainCardView';
