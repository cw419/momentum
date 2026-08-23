import React, { useCallback, useState } from 'react';
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
import { rsipTypeEmojiMap } from './rsipUi';

const EMPTY_GROUPS: RSIPNodeGroup[] = [];

interface RSIPCanvasContainerProps {
  nodes: RSIPNode[];
  tree: RSIPTreeNode[];
  groups?: RSIPNodeGroup[];
  onSaveNodes: (nodes: RSIPNode[]) => void | Promise<void>;
  onMarkFailedNode?: (nodeId: string) => void;
  language: string;
  tr: (zh: string, en: string) => string;
}

export const RSIPCanvasContainer: React.FC<RSIPCanvasContainerProps> = ({
  nodes,
  tree,
  groups,
  onSaveNodes,
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
  } = useRSIPReparent({ nodes, tree, nodesById, onSaveNodes, tr });

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
    if (onMarkFailedNode) {
      onMarkFailedNode(confirmAction.nodeId);
    } else {
      const newNodes = deleteNodeAndDescendants(nodes, confirmAction.nodeId);
      onSaveNodes(newNodes);
    }
    setConfirmAction(null);
  }, [confirmAction, confirmStopTimer, nodes, onMarkFailedNode, onSaveNodes]);

  const handleCancelConfirm = useCallback(() => {
    setConfirmAction(null);
  }, []);

  const handleSaveNodeDetails = useCallback(
    async ({ title, rule, type, groupId }: RSIPNodeDetails) => {
      const node = editingNode;
      if (!node) return;

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
    },
    [editingNode, nodes, onSaveNodes],
  );

  return (
    <RSIPCanvasView
      tree={tree}
      nodePositions={nodePositions}
      groupFrames={groupFrames}
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
