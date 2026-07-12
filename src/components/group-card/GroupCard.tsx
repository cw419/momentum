import React, { useMemo, useRef, useState } from 'react';
import type { ChainTreeNode, ScheduledSession } from '../../types';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import {
  getChainTypeConfig,
  getGroupProgress,
  getNextUnitInGroup,
} from '../../utils/chainTree';
import { useI18n } from '../../i18n';
import { GroupDeleteConfirmDialog } from './components/GroupDeleteConfirmDialog';
import { useDialogFocusRestore } from './hooks/useDialogFocusRestore';
import { useGroupCardScheduleCountdown } from './hooks/useGroupCardScheduleCountdown';
import { GroupCardActions } from './components/GroupCardActions';
import { GroupCardSummary } from './components/GroupCardSummary';

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

          <GroupCardSummary
            group={group}
            progress={progress}
            typeConfig={typeConfig}
            language={language}
            tr={tr}
          />
          <GroupCardActions
            group={group}
            nextUnit={nextUnit}
            scheduledSession={activeScheduledSession}
            timeRemaining={timeRemaining}
            onStartChain={onStartChain}
            onScheduleChain={onScheduleChain}
            onCancelScheduledSession={onCancelScheduledSession}
            onCompleteBooking={onCompleteBooking}
            tr={tr}
          />
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
