import React, { useMemo, useRef, useState } from 'react';
import type { ChainTreeNode, ScheduledSession } from '../../types';
import {
  AlertTriangle,
  Bell,
  Check,
  Clock,
  Flame,
  MoreHorizontal,
  Play,
  Trash2,
  Users,
} from 'lucide-react';
import { formatDuration } from '../../utils/time';
import {
  getChainTypeConfig,
  getGroupProgress,
  getNextUnitInGroup,
} from '../../utils/chainTree';
import { Icon } from '../../utils/iconMap';
import { useI18n } from '../../i18n';
import { GroupDeleteConfirmDialog } from './components/GroupDeleteConfirmDialog';
import { useDialogFocusRestore } from './hooks/useDialogFocusRestore';
import { useGroupCardScheduleCountdown } from './hooks/useGroupCardScheduleCountdown';

interface GroupCardProps {
  group: ChainTreeNode;
  scheduledSession?: ScheduledSession;
  onStartChain: (chainId: string) => void;
  onScheduleChain: (chainId: string) => void;
  onViewDetail: (chainId: string) => void;
  onCancelScheduledSession?: (chainId: string) => void;
  onCompleteBooking?: (chainId: string) => void;
  onDelete: (chainId: string) => void;
}

export const GroupCard: React.FC<GroupCardProps> = React.memo(
  ({
    group,
    scheduledSession,
    onStartChain,
    onScheduleChain,
    onViewDetail,
    onCancelScheduledSession,
    onCompleteBooking,
    onDelete,
  }) => {
    const { language, tr } = useI18n();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const deleteDialogRef = useRef<HTMLDivElement>(null);

    useDialogFocusRestore({
      isOpen: showDeleteConfirm,
      dialogRef: deleteDialogRef,
      onClose: () => setShowDeleteConfirm(false),
    });

    const progress = useMemo(() => getGroupProgress(group), [group]);
    const nextUnit = useMemo(() => getNextUnitInGroup(group), [group]);
    const typeConfig = useMemo(
      () => getChainTypeConfig(group.type, language),
      [group.type, language],
    );

    const { timeRemaining } = useGroupCardScheduleCountdown({
      scheduledSession,
      group,
      nextUnit,
      tr,
    });
    const activeScheduledSession = useMemo(
      () => (scheduledSession && timeRemaining > 0 ? scheduledSession : null),
      [scheduledSession, timeRemaining],
    );
    const isScheduled = !!activeScheduledSession;

    const handleDeleteClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      setShowDeleteConfirm(true);
      setShowMenu(false);
    };

    const handleConfirmDelete = () => {
      onDelete(group.id);
      setShowDeleteConfirm(false);
    };

    const handleCancelDelete = () => {
      setShowDeleteConfirm(false);
    };

    return (
      <div className="relative">
        <div
          className="bento-card group animate-scale-in cursor-pointer border-l-4 border-l-blue-500"
          onClick={() => onViewDetail(group.id)}
          role="button"
          tabIndex={0}
          aria-label={tr(
            `查看详情：${group.name}`,
            `View details: ${group.name}`,
          )}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onViewDetail(group.id);
            }
          }}
        >
          <div className="absolute right-6 top-6">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowMenu((prev) => !prev);
              }}
              aria-label={tr('更多选项', 'More options')}
              aria-expanded={showMenu}
              className="focus-ring min-h-[44px] min-w-[44px] rounded-lg p-3 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <MoreHorizontal size={20} aria-hidden="true" />
            </button>

            {showMenu && (
              <div
                role="menu"
                aria-orientation="vertical"
                className="absolute right-0 top-12 z-10 min-w-[140px] rounded-2xl border border-gray-200 bg-white py-2 shadow-xl dark:border-slate-600 dark:bg-slate-800 dark:shadow-2xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleDeleteClick}
                  className="flex w-full items-center space-x-3 px-4 py-3 text-left text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={14} aria-hidden="true" />
                  <span className="font-chinese font-medium">
                    {tr('删除任务群', 'Delete group')}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="mb-6 flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="mb-3 flex items-center space-x-3">
                <div
                  className={`h-10 w-10 rounded-2xl ${typeConfig.bgColor} flex items-center justify-center`}
                >
                  <Icon
                    name={typeConfig.icon}
                    size={18}
                    className={typeConfig.color}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-chinese text-2xl font-bold text-gray-900 transition-colors group-hover:text-primary-500 dark:text-slate-100">
                      {group.name}
                    </h3>
                    {group.totalCompletions > 0 && (
                      <div className="rounded-lg bg-amber-100 px-2 py-1 text-sm font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        {language === 'zh'
                          ? `#${group.totalCompletions}轮`
                          : `#${group.totalCompletions} cycles`}
                      </div>
                    )}
                  </div>
                  <p className="font-mono text-xs uppercase tracking-wide text-gray-500">
                    {typeConfig.name}
                    {group.totalCompletions > 0 && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">
                        {language === 'zh'
                          ? `• 第${group.totalCompletions + 1}轮进行中`
                          : `• Cycle ${group.totalCompletions + 1} in progress`}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-300">
                {group.description}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-chinese text-sm text-gray-600 dark:text-slate-400">
                {tr('任务进度', 'Progress')}
              </span>
              <span className="font-mono text-sm font-semibold text-blue-500">
                {progress.completed}/{progress.total}
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-slate-700">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-[width] duration-500"
                style={{
                  width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-blue-200/50 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-4 text-center dark:border-blue-400/30 dark:from-blue-500/20 dark:to-blue-600/10">
              <div className="mb-2 flex items-center justify-center space-x-2 text-blue-500">
                <Users size={16} />
                <span className="font-mono text-2xl font-bold">
                  {group.children.length}
                </span>
              </div>
              <div className="font-chinese text-xs font-medium text-gray-600 dark:text-slate-400">
                {tr('子任务数', 'Tasks')}
              </div>
            </div>
            <div className="rounded-2xl border border-primary-200/50 bg-gradient-to-br from-primary-500/10 to-primary-600/5 p-4 text-center dark:border-primary-400/30 dark:from-primary-500/20 dark:to-primary-600/10">
              <div className="mb-2 flex items-center justify-center space-x-2 text-primary-500">
                <Flame size={18} />
                <span className="font-mono text-2xl font-bold">
                  #{group.currentStreak}
                </span>
                {group.groupRepeatCount && group.groupRepeatCount > 1 && (
                  <span className="font-mono text-sm text-gray-500 dark:text-slate-400">
                    ×{group.groupRepeatCount}
                  </span>
                )}
              </div>
              <div className="font-chinese text-xs font-medium text-gray-600 dark:text-slate-400">
                {tr('群组记录', 'Group streak')}
              </div>
            </div>
          </div>

          {isScheduled && (
            <div className="mb-6 rounded-2xl border border-blue-200/50 bg-gradient-to-r from-blue-500/10 to-blue-600/5 p-4 dark:border-blue-400/30 dark:from-blue-500/20 dark:to-blue-600/10">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-blue-600">
                  <Bell size={14} />
                  <span className="font-chinese text-sm font-medium">
                    {tr('预约信号: ', 'Signal: ')}
                    {activeScheduledSession?.auxiliarySignal}
                  </span>
                </div>
                <div className="font-mono text-lg font-bold text-blue-700 dark:text-blue-400">
                  {formatDuration(timeRemaining)}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (activeScheduledSession) {
                      onCompleteBooking?.(activeScheduledSession.chainId);
                    }
                  }}
                  aria-label={tr('完成预约', 'Complete booking')}
                  className="flex flex-1 items-center justify-center space-x-2 rounded-xl border border-green-200/50 bg-green-500/10 px-3 py-3 text-sm text-green-600 transition-colors duration-200 hover:bg-green-500/20 dark:border-green-400/30 dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/30"
                >
                  <Check size={16} aria-hidden="true" />
                  <span className="font-chinese font-medium">
                    {tr('完成预约', 'Complete booking')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (activeScheduledSession) {
                      onCancelScheduledSession?.(
                        activeScheduledSession.chainId,
                      );
                    }
                  }}
                  aria-label={tr('中断/规则判定', 'Interrupt / Adjudicate')}
                  className="flex flex-1 items-center justify-center space-x-2 rounded-xl border border-red-200/50 bg-red-500/10 px-3 py-3 text-sm text-red-600 transition-colors duration-200 hover:bg-red-500/20 dark:border-red-400/30 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
                >
                  <AlertTriangle size={16} aria-hidden="true" />
                  <span className="font-chinese font-medium">
                    {tr('中断/规则判定', 'Interrupt / Adjudicate')}
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onStartChain(nextUnit ? nextUnit.id : group.id);
              }}
              className="gradient-primary focus-ring flex flex-1 items-center justify-center space-x-2 rounded-2xl px-4 py-3 font-medium text-white shadow-lg transition duration-300 hover:scale-105 hover:shadow-xl"
            >
              <Play size={16} aria-hidden="true" />
              <span className="font-chinese font-semibold">
                {tr('开始下一个', 'Start next')}
              </span>
            </button>

            {!isScheduled && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onScheduleChain(nextUnit ? nextUnit.id : group.id);
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

        <GroupDeleteConfirmDialog
          isOpen={showDeleteConfirm}
          group={group}
          tr={tr}
          deleteDialogRef={deleteDialogRef}
          onCancel={handleCancelDelete}
          onConfirm={handleConfirmDelete}
        />
      </div>
    );
  },
);

GroupCard.displayName = 'GroupCard';
