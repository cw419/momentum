import React, { useCallback, useMemo, useState } from 'react';
import type { RSIPNode, RSIPNodeGroup, RSIPTreeNode } from '../../types';
import {
  buildRSIPTree,
  countDescendants,
  deleteNodeAndDescendants,
} from '../../utils/rsipTree';
import { useCanvasState } from '../../hooks/useCanvasState';
import { useRSIPLayout } from './hooks/useRSIPLayout';
import { useRSIPTimers } from './hooks/useRSIPTimers';
import { useRSIPConnectors } from './hooks/useRSIPConnectors';
import { useRSIPReparent } from './hooks/useRSIPReparent';
import { useRSIPCamera } from './hooks/useRSIPCamera';
import { RSIPCanvasView, type ConfirmAction } from './RSIPCanvasView';
import type { RSIPNodeDetails } from './RSIPNodeEditorDialog';
import type { RSIPGroupDetails } from './RSIPGroupEditorDialog';
import { rsipTypeEmojiMap } from './rsipUi';
import { useRSIPGroupConnectors } from './hooks/useRSIPGroupConnectors';
import {
  assignGroupParent,
  canAssignGroupParent,
  getGroupDescendantIds,
  moveNodeSubtreeToGroup,
} from '../../utils/rsipGroupRelations';

const EMPTY_GROUPS: RSIPNodeGroup[] = [];

interface RSIPCanvasContainerProps {
  nodes: RSIPNode[];
  tree: RSIPTreeNode[];
  groups?: RSIPNodeGroup[];
  onSaveNodes: (nodes: RSIPNode[]) => void | Promise<void>;
  onSaveGroups: (groups: RSIPNodeGroup[]) => void | Promise<void>;
  onMarkFailedNode?: (nodeId: string) => void;
  language: string;
  tr: (zh: string, en: string) => string;
}

export const RSIPCanvasContainer: React.FC<RSIPCanvasContainerProps> = ({
  nodes,
  tree,
  groups,
  onSaveNodes,
  onSaveGroups,
  onMarkFailedNode,
  language,
  tr,
}) => {
  const availableGroups = groups ?? EMPTY_GROUPS;
  const { savedState, isLoaded, saveCanvasState } = useCanvasState();
  const [filterType, setFilterType] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const [editingNode, setEditingNode] = useState<RSIPNode | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupReparentingId, setGroupReparentingId] = useState<string | null>(
    null,
  );
  const [groupRelationError, setGroupRelationError] = useState<string | null>(
    null,
  );
  const [pendingNodeGroupMove, setPendingNodeGroupMove] = useState<{
    nodeId: string;
    parentId: string;
    targetGroupId?: string;
    details: RSIPNodeDetails;
  } | null>(null);

  const {
    nodePositions,
    containerHeight,
    layoutNodeHeight,
    groupFrames,
    filteredTree,
    nodesById,
    nodeRefs,
    setNodeRef,
  } = useRSIPLayout(nodes, tree, filterType, availableGroups);

  const {
    now,
    activeTimers,
    formatRemaining,
    formatMinutesLabel,
    handleStartTimer,
    confirmStopTimer,
  } = useRSIPTimers(tr);

  const {
    reparentingId,
    reparentingTitle,
    relationError,
    invalidParentIds,
    hoveredChainIds,
    pinnedId,
    togglePinned,
    handleHoverStart,
    handleHoverEnd,
    toggleReparenting,
    commitReparent,
    cancelReparent,
    setRelationError,
  } = useRSIPReparent({
    nodes,
    tree,
    nodesById,
    onSaveNodes,
    onRequireGroupMigration: (params) => {
      setConfirmAction({
        kind: 'reparentGroupMigration',
        childId: params.childId,
        parentId: params.parentId,
      });
      return true;
    },
    tr,
  });

  const {
    viewportRef,
    containerRef,
    transformRef,
    latestTransformRef,
    contentBounds,
    handleTransformed,
    fitToContent,
  } = useRSIPCamera({
    nodePositions,
    layoutNodeHeight,
    groupFrames,
    savedState,
    isLoaded,
    saveCanvasState,
  });

  const connectors = useRSIPConnectors({
    filteredTree,
    nodePositions,
    hoveredChainIds,
    layoutNodeHeight,
    containerRef,
    nodeRefs,
    latestTransformRef,
  });
  const groupConnectors = useRSIPGroupConnectors(groupFrames);

  const editingGroup = useMemo(
    () => availableGroups.find((group) => group.id === editingGroupId) ?? null,
    [availableGroups, editingGroupId],
  );
  const invalidParentGroupIds = useMemo(
    () =>
      groupReparentingId
        ? new Set([
            groupReparentingId,
            ...getGroupDescendantIds(availableGroups, groupReparentingId),
          ])
        : new Set<string>(),
    [availableGroups, groupReparentingId],
  );
  const canLinkPendingGroupRelation = useMemo(() => {
    if (!pendingNodeGroupMove) return false;
    const parent = nodesById.get(pendingNodeGroupMove.parentId);
    return Boolean(
      parent?.groupId &&
      pendingNodeGroupMove.targetGroupId &&
      canAssignGroupParent(
        availableGroups,
        pendingNodeGroupMove.targetGroupId,
        parent.groupId,
      ),
    );
  }, [availableGroups, nodesById, pendingNodeGroupMove]);

  const handleStopTimer = useCallback((nodeId: string) => {
    setConfirmAction({ kind: 'stopTimer', nodeId });
  }, []);

  const handleFailure = useCallback(
    (nodeId: string) => {
      const treeNodes = buildRSIPTree(nodes);
      const find = (arr: RSIPTreeNode[], id: string): RSIPTreeNode | null => {
        for (const n of arr) {
          if (n.id === id) return n;
          const got = find(n.children, id);
          if (got) return got;
        }
        return null;
      };
      const node = find(treeNodes, nodeId);
      if (!node) return;
      const descendants = countDescendants(node);
      setConfirmAction({
        kind: 'rollbackFailure',
        nodeId,
        nodeTitle: node.title,
        descendants,
      });
    },
    [nodes],
  );

  const handleConfirmAction = useCallback(() => {
    if (!confirmAction) return;
    if (confirmAction.kind === 'stopTimer') {
      confirmStopTimer(confirmAction.nodeId);
      setConfirmAction(null);
      return;
    }
    if (confirmAction.kind === 'reparentGroupMigration') {
      commitReparent(confirmAction.childId, confirmAction.parentId, true);
      setConfirmAction(null);
      return;
    }
    if (onMarkFailedNode) {
      onMarkFailedNode(confirmAction.nodeId);
    } else {
      const newNodes = deleteNodeAndDescendants(nodes, confirmAction.nodeId);
      onSaveNodes(newNodes);
    }
    setConfirmAction(null);
  }, [
    commitReparent,
    confirmAction,
    confirmStopTimer,
    nodes,
    onMarkFailedNode,
    onSaveNodes,
  ]);

  const handleCancelConfirm = useCallback(() => {
    setConfirmAction(null);
  }, []);

  const handleSaveNodeDetails = useCallback(
    async ({ title, rule, type, groupId }: RSIPNodeDetails) => {
      const node = editingNode;
      if (!node) return;

      const parent = node.parentId ? nodesById.get(node.parentId) : undefined;
      if (parent && parent.groupId !== groupId) {
        setPendingNodeGroupMove({
          nodeId: node.id,
          parentId: parent.id,
          targetGroupId: groupId,
          details: { title, rule, type, groupId },
        });
        return false;
      }

      await onSaveNodes(
        nodes.map((item) =>
          item.id === node.id
            ? {
                ...item,
                title,
                rule,
                type,
                groupId,
                emoji: rsipTypeEmojiMap[type] || item.emoji,
              }
            : item,
        ),
      );
      return true;
    },
    [editingNode, nodes, nodesById, onSaveNodes],
  );

  const handleSaveGroupDetails = useCallback(
    async (details: RSIPGroupDetails) => {
      if (!editingGroup) return false;
      await onSaveGroups(
        availableGroups.map((group) =>
          group.id === editingGroup.id ? { ...group, ...details } : group,
        ),
      );
      return true;
    },
    [availableGroups, editingGroup, onSaveGroups],
  );

  const commitGroupReparent = useCallback(
    async (groupId: string, parentGroupId?: string) => {
      if (!canAssignGroupParent(availableGroups, groupId, parentGroupId)) {
        setGroupRelationError(
          tr(
            '不能选择该国策组作为父组（会形成循环）。',
            'Cannot choose this policy group as parent (would create a cycle).',
          ),
        );
        return;
      }
      try {
        await onSaveGroups(
          assignGroupParent(availableGroups, groupId, parentGroupId),
        );
        setGroupReparentingId(null);
        setGroupRelationError(null);
      } catch {
        setGroupRelationError(
          tr(
            '保存组从属关系失败，请重试。',
            'Could not save group relationship. Try again.',
          ),
        );
      }
    },
    [availableGroups, onSaveGroups, tr],
  );

  const commitNodeGroupMove = useCallback(
    async (createGroupRelation: boolean) => {
      const pending = pendingNodeGroupMove;
      if (!pending) return;
      const node = nodesById.get(pending.nodeId);
      const parent = nodesById.get(pending.parentId);
      if (!node || !parent) return;
      const updatedNodes = moveNodeSubtreeToGroup(
        nodes.map((item) =>
          item.id === node.id
            ? {
                ...item,
                parentId: undefined,
                title: pending.details.title,
                rule: pending.details.rule,
                type: pending.details.type,
                emoji: rsipTypeEmojiMap[pending.details.type] || item.emoji,
              }
            : item,
        ),
        node.id,
        pending.targetGroupId,
      );
      await onSaveNodes(updatedNodes);
      if (
        createGroupRelation &&
        parent.groupId &&
        pending.targetGroupId &&
        canAssignGroupParent(
          availableGroups,
          pending.targetGroupId,
          parent.groupId,
        )
      ) {
        await onSaveGroups(
          assignGroupParent(
            availableGroups,
            pending.targetGroupId,
            parent.groupId,
          ),
        );
      }
      setPendingNodeGroupMove(null);
      setEditingNode(null);
    },
    [
      availableGroups,
      nodes,
      nodesById,
      onSaveGroups,
      onSaveNodes,
      pendingNodeGroupMove,
    ],
  );

  return (
    <RSIPCanvasView
      tree={tree}
      nodes={nodes}
      nodePositions={nodePositions}
      groupFrames={groupFrames}
      groupConnectors={groupConnectors}
      connectors={connectors}
      containerHeight={containerHeight}
      contentBounds={contentBounds}
      filterType={filterType}
      confirmAction={confirmAction}
      now={now}
      activeTimers={activeTimers}
      hoveredChainIds={hoveredChainIds}
      pinnedId={pinnedId}
      reparentingId={reparentingId}
      invalidParentIds={invalidParentIds}
      reparentingTitle={reparentingTitle}
      relationError={relationError}
      editingNode={editingNode}
      editingGroup={editingGroup}
      pendingNodeGroupMove={pendingNodeGroupMove}
      canLinkPendingGroupRelation={canLinkPendingGroupRelation}
      groups={availableGroups}
      language={language}
      tr={tr}
      viewportRef={viewportRef}
      containerRef={containerRef}
      transformRef={transformRef}
      onFilterTypeChange={setFilterType}
      onConfirmAction={handleConfirmAction}
      onCancelConfirm={handleCancelConfirm}
      onTransformed={handleTransformed}
      onFitToContent={fitToContent}
      onTogglePinned={togglePinned}
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      onToggleReparent={toggleReparenting}
      onCommitReparent={commitReparent}
      onCancelReparent={cancelReparent}
      onSetRelationError={setRelationError}
      onEditNode={setEditingNode}
      onEditGroup={setEditingGroupId}
      onCloseGroupEditor={() => setEditingGroupId(null)}
      onSaveGroupDetails={handleSaveGroupDetails}
      groupReparentingId={groupReparentingId}
      invalidParentGroupIds={invalidParentGroupIds}
      groupRelationError={groupRelationError}
      onToggleGroupReparent={(groupId) => {
        setGroupRelationError(null);
        setGroupReparentingId((current) =>
          current === groupId ? null : groupId,
        );
      }}
      onCommitGroupReparent={(groupId, parentGroupId) => {
        void commitGroupReparent(groupId, parentGroupId);
      }}
      onCancelGroupReparent={() => {
        setGroupReparentingId(null);
        setGroupRelationError(null);
      }}
      onSetGroupRelationError={setGroupRelationError}
      onCancelNodeGroupMove={() => setPendingNodeGroupMove(null)}
      onMoveNodeGroupOnly={() => void commitNodeGroupMove(false)}
      onMoveNodeGroupAndLink={() => void commitNodeGroupMove(true)}
      onCloseNodeEditor={() => setEditingNode(null)}
      onSaveNodeDetails={handleSaveNodeDetails}
      onMarkFailed={handleFailure}
      onStartTimer={handleStartTimer}
      onStopTimer={handleStopTimer}
      setNodeRef={setNodeRef}
      formatRemaining={formatRemaining}
      formatMinutesLabel={formatMinutesLabel}
    />
  );
};
