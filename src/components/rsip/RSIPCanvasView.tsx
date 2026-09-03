import React from 'react';
import type { RSIPNode, RSIPNodeGroup, RSIPTreeNode } from '../../types';
import type { RSIPConnector } from './RSIPTree';
import type { NodePosition, RSIPGroupFrame } from './hooks/useRSIPLayout';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { RSIPFilters } from './RSIPFilters';
import { RSIPNodeEditorDialog } from './RSIPNodeEditorDialog';
import type { RSIPNodeDetails } from './RSIPNodeEditorDialog';
import { RSIPGroupEditorDialog } from './RSIPGroupEditorDialog';
import type { RSIPGroupDetails } from './RSIPGroupEditorDialog';
import { RSIPNodeGroupMoveDialog } from './RSIPNodeGroupMoveDialog';
import { RSIPTree } from './RSIPTree';
import type { ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch';
import type { RSIPGroupConnector } from './hooks/useRSIPGroupConnectors';

export type ConfirmAction =
  | { kind: 'stopTimer'; nodeId: string }
  | { kind: 'reparentGroupMigration'; childId: string; parentId: string }
  | {
      kind: 'rollbackFailure';
      nodeId: string;
      nodeTitle: string;
      descendants: number;
    };

interface RSIPCanvasViewProps {
  tree: RSIPTreeNode[];
  nodes: RSIPNode[];
  nodePositions: Record<string, NodePosition>;
  groupFrames: RSIPGroupFrame[];
  groupConnectors: RSIPGroupConnector[];
  connectors: RSIPConnector[];
  containerHeight: number;
  contentBounds: {
    minX: number;
    minY: number;
    width: number;
    height: number;
  } | null;
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
  editingNode: RSIPNode | null;
  editingGroup: RSIPNodeGroup | null;
  pendingNodeGroupMove: {
    nodeId: string;
    parentId: string;
    targetGroupId?: string;
    details: RSIPNodeDetails;
  } | null;
  canLinkPendingGroupRelation: boolean;
  groups: RSIPNodeGroup[];
  language: string;
  tr: (zh: string, en: string) => string;
  viewportRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  transformRef: React.RefObject<ReactZoomPanPinchContentRef>;
  onFilterTypeChange: (type: string | null) => void;
  onConfirmAction: () => void;
  onCancelConfirm: () => void;
  onTransformed: (state: {
    scale: number;
    positionX: number;
    positionY: number;
  }) => void;
  onFitToContent: () => void;
  onTogglePinned: (nodeId: string) => void;
  onHoverStart: (nodeId: string) => void;
  onHoverEnd: () => void;
  onToggleReparent: (nodeId: string) => void;
  onCommitReparent: (
    childId: string,
    parentId?: string,
    confirmedGroupMigration?: boolean,
  ) => void;
  onCancelReparent: () => void;
  onSetRelationError: (next: string | null) => void;
  onEditNode: (node: RSIPTreeNode) => void;
  onEditGroup: (groupId: string) => void;
  onCloseGroupEditor: () => void;
  onSaveGroupDetails: (details: RSIPGroupDetails) => Promise<boolean | void>;
  groupReparentingId: string | null;
  invalidParentGroupIds: Set<string>;
  groupRelationError: string | null;
  onToggleGroupReparent: (groupId: string) => void;
  onCommitGroupReparent: (groupId: string, parentGroupId?: string) => void;
  onCancelGroupReparent: () => void;
  onSetGroupRelationError: (next: string | null) => void;
  onCancelNodeGroupMove: () => void;
  onMoveNodeGroupOnly: () => void;
  onMoveNodeGroupAndLink: () => void;
  onCloseNodeEditor: () => void;
  onSaveNodeDetails: (details: RSIPNodeDetails) => Promise<boolean | void>;
  onMarkFailed: (nodeId: string) => void;
  onStartTimer: (nodeId: string, minutes: number) => void;
  onStopTimer: (nodeId: string) => void;
  setNodeRef: (nodeId: string, el: HTMLDivElement | null) => void;
  formatRemaining: (ms: number) => string;
  formatMinutesLabel: (minutes: number) => string;
}

export const RSIPCanvasView: React.FC<RSIPCanvasViewProps> = ({
  tree,
  nodes,
  nodePositions,
  groupFrames,
  groupConnectors,
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
  editingNode,
  editingGroup,
  pendingNodeGroupMove,
  canLinkPendingGroupRelation,
  groups,
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
  onEditNode,
  onEditGroup,
  onCloseGroupEditor,
  onSaveGroupDetails,
  groupReparentingId,
  invalidParentGroupIds,
  groupRelationError,
  onToggleGroupReparent,
  onCommitGroupReparent,
  onCancelGroupReparent,
  onSetGroupRelationError,
  onCancelNodeGroupMove,
  onMoveNodeGroupOnly,
  onMoveNodeGroupAndLink,
  onCloseNodeEditor,
  onSaveNodeDetails,
  onMarkFailed,
  onStartTimer,
  onStopTimer,
  setNodeRef,
  formatRemaining,
  formatMinutesLabel,
}) => {
  const isRollbackFailure = confirmAction?.kind === 'rollbackFailure';
  const isReparentGroupMigration =
    confirmAction?.kind === 'reparentGroupMigration';

  let confirmationTitle = tr('停止计时', 'Stop timer');
  let confirmationMessage = tr('确定要停止计时吗？', 'Stop the timer?');
  let confirmationConfirmText = tr('停止', 'Stop');
  let confirmationConfirmButtonClass = 'bg-amber-500 hover:bg-amber-600';

  if (isRollbackFailure && confirmAction) {
    confirmationTitle = tr('确认回溯', 'Confirm rollback');

    const childNodesLabel =
      confirmAction.descendants === 1 ? 'child node' : 'child nodes';
    confirmationMessage = tr(
      `判定失败：将删除「${confirmAction.nodeTitle}」及其 ${confirmAction.descendants} 个子节点。确认回溯？`,
      `Marked as failed: this will delete "${confirmAction.nodeTitle}" and its ${confirmAction.descendants} ${childNodesLabel}. Roll back?`,
    );
    confirmationConfirmText = tr('回溯', 'Roll back');
    confirmationConfirmButtonClass = 'bg-red-500 hover:bg-red-600';
  }
  if (isReparentGroupMigration && confirmAction) {
    confirmationTitle = tr('确认迁移国策组', 'Confirm policy group migration');
    confirmationMessage = tr(
      '父子节点必须属于同一国策组。继续后，该节点及其全部子节点会迁入新父节点所在组。',
      "Parent and child nodes must belong to the same policy group. Continuing moves this node and all descendants to the new parent's group.",
    );
    confirmationConfirmText = tr('迁移并继续', 'Move and continue');
    confirmationConfirmButtonClass = 'bg-emerald-600 hover:bg-emerald-700';
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

      {editingNode && (
        <RSIPNodeEditorDialog
          node={editingNode}
          groups={groups}
          language={language}
          onClose={onCloseNodeEditor}
          onSave={onSaveNodeDetails}
          tr={tr}
        />
      )}

      {editingGroup && (
        <RSIPGroupEditorDialog
          group={editingGroup}
          onClose={onCloseGroupEditor}
          onSave={onSaveGroupDetails}
          tr={tr}
        />
      )}

      {pendingNodeGroupMove && (
        <RSIPNodeGroupMoveDialog
          nodeTitle={
            nodes.find((node) => node.id === pendingNodeGroupMove.nodeId)
              ?.title ?? pendingNodeGroupMove.nodeId
          }
          parentTitle={
            nodes.find((node) => node.id === pendingNodeGroupMove.parentId)
              ?.title ?? pendingNodeGroupMove.parentId
          }
          sourceGroupTitle={
            groups.find(
              (group) =>
                group.id ===
                nodes.find((node) => node.id === pendingNodeGroupMove.parentId)
                  ?.groupId,
            )?.title
          }
          targetGroupTitle={
            groups.find(
              (group) => group.id === pendingNodeGroupMove.targetGroupId,
            )?.title
          }
          canCreateGroupRelation={canLinkPendingGroupRelation}
          onCancel={onCancelNodeGroupMove}
          onMoveOnly={onMoveNodeGroupOnly}
          onMoveAndLinkGroups={onMoveNodeGroupAndLink}
          tr={tr}
        />
      )}

      <RSIPFilters
        filterType={filterType}
        onFilterTypeChange={onFilterTypeChange}
        language={language}
        tr={tr}
      />

      <RSIPTree
        tree={tree}
        nodePositions={nodePositions}
        groupFrames={groupFrames}
        groupConnectors={groupConnectors}
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
        onEditNode={onEditNode}
        groupReparentingId={groupReparentingId}
        invalidParentGroupIds={invalidParentGroupIds}
        groupRelationError={groupRelationError}
        onEditGroup={onEditGroup}
        onToggleGroupReparent={onToggleGroupReparent}
        onCommitGroupReparent={onCommitGroupReparent}
        onCancelGroupReparent={onCancelGroupReparent}
        onSetGroupRelationError={onSetGroupRelationError}
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
