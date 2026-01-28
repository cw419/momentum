import React from 'react';
import type { RSIPTreeNode } from '../../types';
import type { RSIPConnector } from './RSIPTree';
import type { NodePosition } from './hooks/useRSIPLayout';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { RSIPFilters } from './RSIPFilters';
import { RSIPTree } from './RSIPTree';
import type { ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch';

export type ConfirmAction =
  | { kind: 'stopTimer'; nodeId: string }
  | { kind: 'rollbackFailure'; nodeId: string; nodeTitle: string; descendants: number };

interface RSIPCanvasViewProps {
  tree: RSIPTreeNode[];
  nodePositions: Record<string, NodePosition>;
  connectors: RSIPConnector[];
  containerHeight: number;
  contentBounds: { minX: number; minY: number; width: number; height: number } | null;
  filterType: string | null;
  confirmAction: ConfirmAction | null;
  now: number;
  activeTimers: Record<string, number>;
  hoveredChainIds: Set<string>;
  pinnedId: string | null;
  reparentingId: string | null;
  invalidParentIds: Set<string>;
  reparentingTitle: string | null;
  relationError: string | null;
  language: string;
  tr: (zh: string, en: string) => string;
  viewportRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  transformRef: React.RefObject<ReactZoomPanPinchContentRef>;
  onFilterTypeChange: (type: string | null) => void;
  onConfirmAction: () => void;
  onCancelConfirm: () => void;
  onTransformed: (state: { scale: number; positionX: number; positionY: number }) => void;
  onFitToContent: () => void;
  onTogglePinned: (nodeId: string) => void;
  onHoverStart: (nodeId: string) => void;
  onHoverEnd: () => void;
  onToggleReparent: (nodeId: string) => void;
  onCommitReparent: (childId: string, parentId?: string) => void;
  onCancelReparent: () => void;
  onSetRelationError: (next: string | null) => void;
  onMarkFailed: (nodeId: string) => void;
  onStartTimer: (nodeId: string, minutes: number) => void;
  onStopTimer: (nodeId: string) => void;
  setNodeRef: (nodeId: string, el: HTMLDivElement | null) => void;
  formatRemaining: (ms: number) => string;
  formatMinutesLabel: (minutes: number) => string;
}

export const RSIPCanvasView: React.FC<RSIPCanvasViewProps> = ({
  tree,
  nodePositions,
  connectors,
  containerHeight,
  contentBounds,
  filterType,
  confirmAction,
  now,
  activeTimers,
  hoveredChainIds,
  pinnedId,
  reparentingId,
  invalidParentIds,
  reparentingTitle,
  relationError,
  language,
  tr,
  viewportRef,
  containerRef,
  transformRef,
  onFilterTypeChange,
  onConfirmAction,
  onCancelConfirm,
  onTransformed,
  onFitToContent,
  onTogglePinned,
  onHoverStart,
  onHoverEnd,
  onToggleReparent,
  onCommitReparent,
  onCancelReparent,
  onSetRelationError,
  onMarkFailed,
  onStartTimer,
  onStopTimer,
  setNodeRef,
  formatRemaining,
  formatMinutesLabel,
}) => {
  const isRollbackFailure = confirmAction?.kind === 'rollbackFailure';

  let confirmationTitle = tr('停止计时', 'Stop timer');
  let confirmationMessage = tr('确定要停止计时吗？', 'Stop the timer?');
  let confirmationConfirmText = tr('停止', 'Stop');
  let confirmationConfirmButtonClass = 'bg-amber-500 hover:bg-amber-600';

  if (isRollbackFailure && confirmAction) {
    confirmationTitle = tr('确认回溯', 'Confirm rollback');

    const childNodesLabel = confirmAction.descendants === 1 ? 'child node' : 'child nodes';
    confirmationMessage = tr(
      `判定失败：将删除「${confirmAction.nodeTitle}」及其 ${confirmAction.descendants} 个子节点。确认回溯？`,
      `Marked as failed: this will delete "${confirmAction.nodeTitle}" and its ${confirmAction.descendants} ${childNodesLabel}. Roll back?`
    );
    confirmationConfirmText = tr('回溯', 'Roll back');
    confirmationConfirmButtonClass = 'bg-red-500 hover:bg-red-600';
  }

  return (
    <>
      <ConfirmationDialog
        isOpen={confirmAction !== null}
        title={confirmationTitle}
        message={confirmationMessage}
        confirmText={confirmationConfirmText}
        cancelText={tr('取消', 'Cancel')}
        confirmButtonClass={confirmationConfirmButtonClass}
        onConfirm={onConfirmAction}
        onCancel={onCancelConfirm}
      />

      <RSIPFilters
        filterType={filterType}
        onFilterTypeChange={onFilterTypeChange}
        language={language}
        tr={tr}
      />

      <RSIPTree
        tree={tree}
        nodePositions={nodePositions}
        connectors={connectors}
        containerHeight={containerHeight}
        contentBounds={contentBounds}
        viewportRef={viewportRef}
        containerRef={containerRef}
        transformRef={transformRef}
        onTransformed={onTransformed}
        onFitToContent={onFitToContent}
        now={now}
        activeTimers={activeTimers}
        hoveredChainIds={hoveredChainIds}
        pinnedId={pinnedId}
        reparentingId={reparentingId}
        invalidParentIds={invalidParentIds}
        reparentingTitle={reparentingTitle}
        relationError={relationError}
        onTogglePinned={onTogglePinned}
        onHoverStart={onHoverStart}
        onHoverEnd={onHoverEnd}
        onToggleReparent={onToggleReparent}
        onCommitReparent={onCommitReparent}
        onCancelReparent={onCancelReparent}
        onSetRelationError={onSetRelationError}
        onMarkFailed={onMarkFailed}
        onStartTimer={onStartTimer}
        onStopTimer={onStopTimer}
        setNodeRef={setNodeRef}
        formatRemaining={formatRemaining}
        formatMinutesLabel={formatMinutesLabel}
        tr={tr}
      />
    </>
  );
};
