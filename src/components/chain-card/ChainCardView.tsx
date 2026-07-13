/**
 * ChainCardView - 纯展示组件
 * 负责 ChainCard 的所有 UI 渲染，不包含任何业务逻辑
 */

import React from 'react';
import {
  Play,
  Clock,
  MoreHorizontal,
  Trash2,
  Flame,
  Calendar,
  Bell,
  Check,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import {
  formatDuration,
  formatTime,
  formatTimeDescriptionByLanguage,
} from '../../utils/time';
import { Icon } from '../../utils/iconMap';
import {
  getAuxiliarySignalLabel,
  getTriggerLabel,
} from '../chain-editor/constants';
import type { ChainCardViewProps } from './types';
import { ChainDeleteConfirmModal } from './components/ChainDeleteConfirmModal';

export const ChainCardView: React.FC<ChainCardViewProps> = React.memo(
  ({
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

    const completionUnit =
      chain.totalCompletions === 1 ? 'completion' : 'completions';
    const completionsText =
      language === 'zh'
        ? `${chain.totalCompletions} 次完成`
        : `${chain.totalCompletions} ${completionUnit}`;

    const STREAK_MILESTONES = [7, 30, 100, 365];
    const isMilestone =
      chain.currentStreak > 0 && STREAK_MILESTONES.includes(chain.currentStreak);
    const isZeroStreak = chain.currentStreak === 0;
    const isZeroAuxStreak = chain.auxiliaryStreak === 0;

    return (
      <div className="relative">
        <div
          className="bento-card group animate-scale-in cursor-pointer"
          onClick={onViewDetail}
          role="button"
          tabIndex={0}
          aria-label={tr(
            `查看详情：${chain.name}`,
            `View details: ${chain.name}`,
          )}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onViewDetail();
            }
          }}
        >
          {/* Menu button */}
          <div className="absolute right-6 top-6">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMenu();
              }}
              aria-label={tr('更多选项', 'More options')}
              aria-expanded={showMenu ? 'true' : 'false'}
              className="focus-ring min-h-[44px] min-w-[44px] rounded-lg p-3 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
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
                className="absolute right-0 top-12 z-10 flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-white text-red-500 shadow-xl transition-colors hover:bg-red-50 dark:border-slate-600 dark:bg-slate-800 dark:text-red-400 dark:shadow-2xl dark:hover:bg-red-900/20"
              >
                <Trash2 size={22} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-4">
              <div className="mb-3 flex items-center space-x-3">
                <div
                  className={`h-8 w-8 rounded-xl ${typeConfig.bgColor} flex flex-shrink-0 items-center justify-center`}
                >
                  <Icon
                    name={typeConfig.icon}
                    size={14}
                    className={typeConfig.color}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-chinese text-2xl font-bold text-gray-900 transition-colors group-hover:text-primary-500 dark:text-slate-100">
                    {chain.name}
                  </h3>
                  {chain.type !== 'unit' && (
                    <p className="truncate font-mono text-xs tracking-wide text-gray-500">
                      {typeConfig.name}
                    </p>
                  )}
                </div>
              </div>
              <p className="mb-3 truncate font-mono text-sm tracking-wide text-gray-600 dark:text-slate-400">
                {getTriggerLabel(chain.trigger, language)}
              </p>
              <p className="line-clamp-2 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
                {chain.description}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-primary-200/50 bg-gradient-to-br from-primary-500/10 to-primary-600/5 p-4 text-center dark:border-primary-400/30 dark:from-primary-500/20 dark:to-primary-600/10">
              {isZeroStreak ? (
                <div className="flex flex-col items-center justify-center gap-1 py-0.5">
                  <Sparkles size={18} className="text-primary-400 dark:text-primary-500" aria-hidden="true" />
                  <span className="font-chinese text-xs font-semibold text-primary-600 dark:text-primary-400">
                    {tr('开始第一链', 'Start first chain')}
                  </span>
                </div>
              ) : (
                <div className={`mb-2 flex items-center justify-center space-x-2 text-primary-500 ${isMilestone ? 'animate-milestone-glow' : ''}`}>
                  <Flame size={18} aria-hidden="true" />
                  <span className="font-mono text-3xl font-bold">
                    #{chain.currentStreak}
                  </span>
                </div>
              )}
              <div className="font-chinese text-xs font-medium text-gray-600 dark:text-slate-400">
                {tr('主链记录', 'Main streak')}
              </div>
            </div>
            <div className="rounded-2xl border border-blue-200/50 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-4 text-center dark:border-blue-400/30 dark:from-blue-500/20 dark:to-blue-600/10">
              {isZeroAuxStreak ? (
                <div className="flex flex-col items-center justify-center gap-1 py-0.5">
                  <Calendar size={18} className="text-blue-400 dark:text-blue-500" aria-hidden="true" />
                  <span className="font-chinese text-xs font-semibold text-blue-500 dark:text-blue-400">
                    {tr('尚无预约', 'No bookings yet')}
                  </span>
                </div>
              ) : (
                <div className="mb-2 flex items-center justify-center space-x-2 text-blue-500">
                  <Calendar size={18} aria-hidden="true" />
                  <span className="font-mono text-3xl font-bold">
                    #{chain.auxiliaryStreak}
                  </span>
                </div>
              )}
              <div className="font-chinese text-xs font-medium text-gray-600 dark:text-slate-400">
                {tr('预约链记录', 'Booking streak')}
              </div>
            </div>
          </div>

          {/* Duration and completions */}
          <div className="mb-6 flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50">
            <div className="flex items-center space-x-2 text-gray-700 dark:text-slate-300">
              <Clock size={16} />
              <span className="font-medium">{durationText}</span>
            </div>
            <div className="font-mono text-sm text-gray-600 dark:text-slate-400">
              {completionsText}
            </div>
          </div>

          {/* Scheduled session */}
          {isScheduled && scheduledSession && (
            <div className="mb-6 rounded-2xl border border-blue-200/50 bg-gradient-to-r from-blue-500/10 to-blue-600/5 p-4 dark:border-blue-400/30 dark:from-blue-500/20 dark:to-blue-600/10">
              <div className="mb-3 flex items-center justify-between">
                <div className="mr-2 flex min-w-0 flex-1 items-center space-x-2 text-blue-600">
                  <Bell size={14} className="flex-shrink-0" />
                  <span className="truncate font-chinese text-sm font-medium">
                    {tr('预约信号: ', 'Signal: ')}
                    {getAuxiliarySignalLabel(
                      scheduledSession.auxiliarySignal,
                      language,
                    )}
                  </span>
                </div>
                <div className="flex-shrink-0 font-mono text-lg font-bold text-blue-700 dark:text-blue-400">
                  {formatDuration(timeRemaining)}
                </div>
              </div>
              <div className="mb-3 truncate font-chinese text-xs text-blue-600 dark:text-blue-400">
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
                  className="flex flex-1 items-center justify-center space-x-2 rounded-xl border border-green-200/50 bg-green-500/10 px-3 py-3 text-sm text-green-600 transition-colors duration-200 hover:bg-green-500/20 dark:border-green-400/30 dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/30"
                >
                  <Check size={14} />
                  <span className="font-chinese font-medium">
                    {tr('完成预约', 'Complete booking')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelScheduledSession();
                  }}
                  className="flex flex-1 items-center justify-center space-x-2 rounded-xl border border-red-200/50 bg-red-500/10 px-3 py-3 text-sm text-red-600 transition-colors duration-200 hover:bg-red-500/20 dark:border-red-400/30 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
                >
                  <AlertTriangle size={14} />
                  <span className="font-chinese font-medium">
                    {tr('中断/规则判定', 'Interrupt / Adjudicate')}
                  </span>
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
              className="gradient-primary focus-ring flex flex-1 items-center justify-center space-x-2 rounded-2xl px-4 py-3 font-medium text-white shadow-lg transition duration-300 hover:scale-105 hover:shadow-xl"
            >
              <Play size={16} aria-hidden="true" />
              <span className="font-chinese font-semibold">
                {tr('开始任务', 'Start')}
              </span>
            </button>

            {!isScheduled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onScheduleChain();
                }}
                className="gradient-dark focus-ring flex flex-1 items-center justify-center space-x-2 rounded-2xl px-4 py-3 font-medium text-white shadow-lg transition duration-300 hover:scale-105 hover:shadow-xl"
              >
                <Clock size={16} aria-hidden="true" />
                <span className="font-chinese font-semibold">
                  {tr('预约', 'Schedule')}
                </span>
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
  },
);

ChainCardView.displayName = 'ChainCardView';
