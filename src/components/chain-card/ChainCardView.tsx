import React from 'react';
import {
  getAuxiliarySignalLabel,
  getTriggerLabel,
} from '../chain-editor/constants';
import { CardOverflowMenu } from '../shared/CardOverflowMenu';
import { ChainExecutionActions } from '../shared/ChainExecutionActions';
import { ChainDeleteConfirmModal } from './components/ChainDeleteConfirmModal';
import { ChainCardMetrics } from './components/ChainCardMetrics';
import { ChainCardSummary } from './components/ChainCardSummary';
import type { ChainCardViewProps } from './types';

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
  }) => {
    const scheduled =
      isScheduled && scheduledSession
        ? {
            signal: getAuxiliarySignalLabel(
              scheduledSession.auxiliarySignal,
              language,
            ),
            timeRemaining,
            completionTrigger: getTriggerLabel(
              chain.auxiliaryCompletionTrigger,
              language,
            ),
          }
        : undefined;

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
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onViewDetail();
            }
          }}
        >
          <CardOverflowMenu
            isOpen={showMenu}
            moreLabel={tr('更多选项', 'More options')}
            deleteLabel={tr('删除链条', 'Delete chain')}
            onToggle={onToggleMenu}
            onDelete={onShowDeleteConfirm}
          />
          <ChainCardSummary
            chain={chain}
            typeConfig={typeConfig}
            language={language}
          />
          <ChainCardMetrics
            chain={chain}
            language={language}
            tr={tr}
            lastCompletionTime={lastCompletionTime}
          />
          <ChainExecutionActions
            scheduled={scheduled}
            signalPrefix={tr('预约信号: ', 'Signal: ')}
            completionPrefix={tr(
              '请在时间结束前完成: ',
              'Complete before time runs out: ',
            )}
            completeLabel={tr('完成预约', 'Complete booking')}
            interruptLabel={tr('中断/规则判定', 'Interrupt / Adjudicate')}
            startLabel={tr('开始任务', 'Start')}
            scheduleLabel={tr('预约', 'Schedule')}
            onComplete={onCompleteBooking}
            onInterrupt={onCancelScheduledSession}
            onStart={onStartChain}
            onSchedule={onScheduleChain}
          />
        </div>

        <ChainDeleteConfirmModal
          isOpen={showDeleteConfirm}
          chain={chain}
          language={language}
          tr={tr}
          onCancel={onCancelDelete}
          onConfirm={onConfirmDelete}
        />
      </div>
    );
  },
);

ChainCardView.displayName = 'ChainCardView';
