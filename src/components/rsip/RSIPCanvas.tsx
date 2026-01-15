import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch';
import type { RSIPNode, RSIPTreeNode } from '../../types';
import { buildRSIPTree, countDescendants, deleteNodeAndDescendants } from '../../utils/rsipTree';
import { useCanvasState, type CanvasState } from '../../hooks/useCanvasState';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { RSIPFilters } from './RSIPFilters';
import { RSIPTree, type RSIPConnector } from './RSIPTree';

const MIN_RSIP_NODE_SPACING_Y = 220;
const RSIP_NODE_SPACING_PADDING_Y = 40;

interface RSIPCanvasProps {
  nodes: RSIPNode[];
  tree: RSIPTreeNode[];
  onSaveNodes: (nodes: RSIPNode[]) => void;
  language: string;
  tr: (zh: string, en: string) => string;
}

type ConfirmAction =
  | { kind: 'stopTimer'; nodeId: string }
  | { kind: 'rollbackFailure'; nodeId: string; nodeTitle: string; descendants: number };

export const RSIPCanvas: React.FC<RSIPCanvasProps> = ({ nodes, tree, onSaveNodes, language, tr }) => {
  const { savedState, isLoaded, saveCanvasState } = useCanvasState();

  const [filterType, setFilterType] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [connectors, setConnectors] = useState<RSIPConnector[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [reparentingId, setReparentingId] = useState<string | null>(null);
  const [relationError, setRelationError] = useState<string | null>(null);
  const [hoveredChainIds, setHoveredChainIds] = useState<Set<string>>(new Set());

  const [layoutNodeHeight, setLayoutNodeHeight] = useState<number>(MIN_RSIP_NODE_SPACING_Y);
  const [nodePositions, setNodePositions] = useState<Record<string, { node: RSIPTreeNode; style: React.CSSProperties }>>({});
  const [containerHeight, setContainerHeight] = useState<number>(600);
  const transformRef = useRef<ReactZoomPanPinchContentRef>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const latestTransformRef = useRef<CanvasState>({ scale: 1, positionX: 0, positionY: 0 });
  const didInitCameraRef = useRef(false);

  const setNodeRef = useCallback((nodeId: string, el: HTMLDivElement | null) => {
    nodeRefs.current[nodeId] = el;
  }, []);

  const nodesById = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const reparentingTitle = useMemo(() => {
    if (!reparentingId) return null;
    return nodesById.get(reparentingId)?.title ?? reparentingId;
  }, [nodesById, reparentingId]);

  const handleTransformed = useCallback((state: { scale: number; positionX: number; positionY: number }) => {
    const next: CanvasState = {
      scale: state.scale,
      positionX: state.positionX,
      positionY: state.positionY,
    };
    latestTransformRef.current = next;
    saveCanvasState(next);
  }, [saveCanvasState]);

  const togglePinned = useCallback((nodeId: string) => {
    setPinnedId(prev => (prev === nodeId ? null : nodeId));
  }, []);

  const handleHoverStart = useCallback((nodeId: string) => setHoveredId(nodeId), []);
  const handleHoverEnd = useCallback(() => setHoveredId(null), []);

  const toggleReparenting = useCallback((nodeId: string) => {
    setPinnedId(nodeId);
    setRelationError(null);
    setReparentingId(prev => (prev === nodeId ? null : nodeId));
  }, []);

  const filteredTree = useMemo(() => {
    if (!filterType) return tree;
    const filteredNodes = new Set(nodes.filter(n => (n.type || 'policy') === filterType).map(n => n.id));
    if (filteredNodes.size === 0) return [];

    const visibleNodes = new Set<string>();
    // 从匹配的节点向上找到所有祖先
    filteredNodes.forEach(id => {
      let current = nodesById.get(id);
      while (current) {
        visibleNodes.add(current.id);
        current = current.parentId ? nodesById.get(current.parentId) : undefined;
      }
    });

    const finalNodes = nodes.filter(n => visibleNodes.has(n.id));
    return buildRSIPTree(finalNodes);
  }, [tree, filterType, nodes, nodesById]);

  // Core layout algorithm: compute absolute positions (top, left)
  useEffect(() => {
    if (filteredTree.length === 0) {
      setNodePositions({});
      setContainerHeight(200);
      return;
    }

    const positions: Record<string, { node: RSIPTreeNode; style: React.CSSProperties }> = {};
    const LEVEL_WIDTH = 320; // 每列宽度
    const NODE_HEIGHT = layoutNodeHeight; // 节点高度（含间距，避免长文本遮挡）
    const START_X = 20;
    const START_Y = 20;

    let currentY = START_Y;

    const layout = (node: RSIPTreeNode, depth: number): number => {
      // Leaf node
      if (node.children.length === 0) {
        const y = currentY;
        positions[node.id] = {
          node,
          style: { left: START_X + depth * LEVEL_WIDTH, top: y },
        };
        currentY += NODE_HEIGHT;
        return y;
      }

      // Layout children first
      const childYs: number[] = [];
      node.children.forEach(child => {
        childYs.push(layout(child, depth + 1));
      });

      // Center parent between children
      const minY = Math.min(...childYs);
      const maxY = Math.max(...childYs);
      const y = (minY + maxY) / 2;

      positions[node.id] = {
        node,
        style: { left: START_X + depth * LEVEL_WIDTH, top: y },
      };
      return y;
    };

    filteredTree.forEach(root => {
      layout(root, 0);
      // extra spacing between families
      currentY += 40;
    });

    setNodePositions(positions);
    setContainerHeight(Math.max(600, currentY + 100));
  }, [filteredTree, layoutNodeHeight]);

  useEffect(() => {
    const measureAndUpdate = () => {
      const heights = Object.values(nodeRefs.current)
        .map(el => el?.offsetHeight ?? 0)
        .filter(h => h > 0);
      if (heights.length === 0) return;

      const maxCardHeight = Math.max(...heights);
      const nextSpacing = Math.max(MIN_RSIP_NODE_SPACING_Y, Math.ceil(maxCardHeight + RSIP_NODE_SPACING_PADDING_Y));

      setLayoutNodeHeight(prev => (nextSpacing > prev ? nextSpacing : prev));
    };

    const raf = window.requestAnimationFrame(measureAndUpdate);
    window.addEventListener('resize', measureAndUpdate);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', measureAndUpdate);
    };
  }, [nodePositions]);

  const getAncestors = useMemo(() => (id?: string | null): string[] => {
    const res: string[] = [];
    let cur = id ? nodesById.get(id) : undefined;
    while (cur && cur.parentId) {
      res.push(cur.parentId);
      cur = nodesById.get(cur.parentId);
    }
    return res;
  }, [nodesById]);

  const getDescendantsFromTree = useMemo(() => (id: string): string[] => {
    const res: string[] = [];
    const findInTree = (arr: RSIPTreeNode[], targetId: string): RSIPTreeNode | null => {
      for (const n of arr) {
        if (n.id === targetId) return n;
        const r = findInTree(n.children, targetId);
        if (r) return r;
      }
      return null;
    };
    const node = findInTree(tree, id);
    if (!node) return res;
    const walk = (n: RSIPTreeNode) => {
      n.children.forEach(c => {
        res.push(c.id);
        walk(c);
      });
    };
    walk(node);
    return res;
  }, [tree]);

  const invalidParentIds = useMemo(() => {
    if (!reparentingId) return new Set<string>();
    return new Set([reparentingId, ...getDescendantsFromTree(reparentingId)]);
  }, [getDescendantsFromTree, reparentingId]);

  const commitReparent = useCallback((childId: string, parentId?: string) => {
    if (childId === parentId) {
      setRelationError(tr('不能选择自身作为父节点。', 'Cannot select the node itself as parent.'));
      return;
    }
    if (parentId) {
      const descendants = getDescendantsFromTree(childId);
      if (descendants.includes(parentId)) {
        setRelationError(tr('不能把节点移动到自己的后代下面。', 'Cannot move a node under its descendant.'));
        return;
      }
    }

    const updated = nodes.map(n => (n.id === childId ? { ...n, parentId: parentId || undefined } : n));
    onSaveNodes(updated);
    setPinnedId(childId);
    setReparentingId(null);
    setRelationError(null);
  }, [getDescendantsFromTree, nodes, onSaveNodes, tr]);

  const cancelReparent = useCallback(() => {
    setReparentingId(null);
    setRelationError(null);
  }, []);

  // hover chain: include ancestors and descendants
  useEffect(() => {
    const activeId = reparentingId ?? pinnedId ?? hoveredId;
    if (!activeId) {
      setHoveredChainIds(new Set());
      return;
    }
    const ids = new Set<string>();
    ids.add(activeId);
    getAncestors(activeId).forEach(id => ids.add(id));
    getDescendantsFromTree(activeId).forEach(id => ids.add(id));
    setHoveredChainIds(ids);
  }, [hoveredId, pinnedId, reparentingId, getAncestors, getDescendantsFromTree]);

  // Timer Logic
  const [now, setNow] = useState<number>(Date.now());
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({}); // nodeId -> endsAt ms

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // check timers
    Object.entries(activeTimers).forEach(([id, endsAt]) => {
      if (now >= endsAt) {
        // notify once and clear
        setActiveTimers(prev => {
          const copy = { ...prev } as Record<string, number>;
          delete copy[id];
          return copy;
        });
        try {
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(tr('计时完成', 'Timer complete'), { body: tr('RSIP 定式计时已结束', 'RSIP timer has ended') });
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission();
            }
          }
        } catch {
          // ignore
        }
      }
    });
  }, [now, activeTimers, tr]);

  const formatRemaining = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const formatMinutesLabel = (minutes: number) => tr(`${minutes} 分钟`, `${minutes} min`);

  const handleStartTimer = (nodeId: string, minutes: number) => {
    const endsAt = Date.now() + minutes * 60 * 1000;
    setActiveTimers(prev => ({ ...prev, [nodeId]: endsAt }));
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handleStopTimer = (nodeId: string) => {
    setConfirmAction({ kind: 'stopTimer', nodeId });
  };

  const handleFailure = (nodeId: string) => {
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
  };

  // Compute connector paths
  useEffect(() => {
    const compute = () => {
      const container = containerRef.current;
      if (!container) return;
      const newConnectors: RSIPConnector[] = [];

      const getAnchor = (nodeId: string, side: 'left' | 'right') => {
        const pos = nodePositions[nodeId];
        if (!pos) return { x: 0, y: 0 };

        const el = nodeRefs.current[nodeId];
        if (el) {
          const elRect = el.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const scale = latestTransformRef.current.scale || 1;

          const x =
            side === 'left'
              ? (elRect.left - containerRect.left) / scale
              : (elRect.right - containerRect.left) / scale;
          const y = ((elRect.top - containerRect.top) + elRect.height / 2) / scale;
          return { x, y };
        }

        const styleLeft = Number(pos.style.left);
        const styleTop = Number(pos.style.top);
        const width = 256; // w-64
        const height = Math.max(120, layoutNodeHeight - RSIP_NODE_SPACING_PADDING_Y); // approx card height

        const x = side === 'left' ? styleLeft : styleLeft + width;
        const y = styleTop + height / 2;
        return { x, y };
      };

      const walk = (node: RSIPTreeNode) => {
        node.children.forEach(child => {
          if (nodePositions[node.id] && nodePositions[child.id]) {
            const p1 = getAnchor(node.id, 'right');
            const p2 = getAnchor(child.id, 'left');

            const dx = p2.x - p1.x;
            const base = Math.max(40, Math.abs(dx) * 0.5);
            const cx1 = p1.x + base;
            const cy1 = p1.y;
            const cx2 = p2.x - base;
            const cy2 = p2.y;

            const d = `M ${p1.x} ${p1.y} C ${cx1} ${cy1} ${cx2} ${cy2} ${p2.x} ${p2.y}`;
            const id = `${node.id}_${child.id}`;
            const isHovered = hoveredChainIds.has(node.id) && hoveredChainIds.has(child.id);
            newConnectors.push({ id, d, isHovered });
          }
        });
        node.children.forEach(walk);
      };

      filteredTree.forEach(root => walk(root));
      setConnectors(newConnectors);
    };

    compute();
    const t = setTimeout(compute, 50);
    window.addEventListener('resize', compute);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', compute);
    };
  }, [filteredTree, hoveredChainIds, nodePositions, layoutNodeHeight]);

  const contentBounds = useMemo(() => {
    const entries = Object.values(nodePositions);
    if (entries.length === 0) return null;

    const NODE_WIDTH = 256; // w-64
    const NODE_HEIGHT = layoutNodeHeight; // layout spacing

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const { style } of entries) {
      const x = Number(style.left) || 0;
      const y = Number(style.top) || 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + NODE_WIDTH);
      maxY = Math.max(maxY, y + NODE_HEIGHT);
    }

    return {
      minX,
      minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  }, [nodePositions, layoutNodeHeight]);

  const fitToContent = useCallback(() => {
    const viewport = viewportRef.current;
    const bounds = contentBounds;
    const api = transformRef.current;
    if (!viewport || !bounds || !api) return;

    const padding = 40;
    const rect = viewport.getBoundingClientRect();
    const viewportWidth = rect.width;
    const viewportHeight = rect.height;

    const scaleX = (viewportWidth - padding * 2) / bounds.width;
    const scaleY = (viewportHeight - padding * 2) / bounds.height;
    const scale = Math.min(scaleX, scaleY, 1);

    const translateX = (viewportWidth - bounds.width * scale) / 2 - bounds.minX * scale;
    const translateY = (viewportHeight - bounds.height * scale) / 2 - bounds.minY * scale;

    const next: CanvasState = { scale, positionX: translateX, positionY: translateY };
    latestTransformRef.current = next;
    saveCanvasState(next);
    api.setTransform(translateX, translateY, scale, 250, 'easeOut');
  }, [contentBounds, saveCanvasState]);

  useEffect(() => {
    if (didInitCameraRef.current) return;
    if (!isLoaded) return;

    if (savedState && transformRef.current) {
      latestTransformRef.current = savedState;
      transformRef.current.setTransform(savedState.positionX, savedState.positionY, savedState.scale, 0);
      didInitCameraRef.current = true;
      return;
    }

    if (!savedState && contentBounds && transformRef.current) {
      fitToContent();
      didInitCameraRef.current = true;
    }
  }, [contentBounds, fitToContent, isLoaded, savedState]);

  return (
    <>
      <ConfirmationDialog
        isOpen={confirmAction !== null}
        title={
          confirmAction && confirmAction.kind === 'rollbackFailure'
            ? tr('确认回溯', 'Confirm rollback')
            : tr('停止计时', 'Stop timer')
        }
        message={
          confirmAction && confirmAction.kind === 'rollbackFailure'
            ? tr(
                `判定失败：将删除「${confirmAction.nodeTitle}」及其 ${confirmAction.descendants} 个子节点。确认回溯？`,
                `Marked as failed: this will delete "${confirmAction.nodeTitle}" and its ${confirmAction.descendants} child node${confirmAction.descendants === 1 ? '' : 's'}. Roll back?`
              )
            : tr('确定要停止计时吗？', 'Stop the timer?')
        }
        confirmText={
          confirmAction && confirmAction.kind === 'rollbackFailure' ? tr('回溯', 'Roll back') : tr('停止', 'Stop')
        }
        cancelText={tr('取消', 'Cancel')}
        confirmButtonClass={
          confirmAction && confirmAction.kind === 'rollbackFailure'
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-amber-500 hover:bg-amber-600'
        }
        onConfirm={() => {
          if (!confirmAction) return;

          if (confirmAction.kind === 'stopTimer') {
            setActiveTimers(prev => {
              const copy = { ...prev };
              delete copy[confirmAction.nodeId];
              return copy;
            });
            setConfirmAction(null);
            return;
          }

          const newNodes = deleteNodeAndDescendants(nodes, confirmAction.nodeId);
          onSaveNodes(newNodes);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <RSIPFilters filterType={filterType} onFilterTypeChange={setFilterType} language={language} tr={tr} />

      {/* Tree */}
      <RSIPTree
        tree={tree}
        nodePositions={nodePositions}
        connectors={connectors}
        containerHeight={containerHeight}
        contentBounds={contentBounds}
        viewportRef={viewportRef}
        containerRef={containerRef}
        transformRef={transformRef}
        onTransformed={handleTransformed}
        onFitToContent={fitToContent}
        now={now}
        activeTimers={activeTimers}
        hoveredChainIds={hoveredChainIds}
        pinnedId={pinnedId}
        reparentingId={reparentingId}
        invalidParentIds={invalidParentIds}
        reparentingTitle={reparentingTitle}
        relationError={relationError}
        onTogglePinned={togglePinned}
        onHoverStart={handleHoverStart}
        onHoverEnd={handleHoverEnd}
        onToggleReparent={toggleReparenting}
        onCommitReparent={commitReparent}
        onCancelReparent={cancelReparent}
        onSetRelationError={setRelationError}
        onMarkFailed={handleFailure}
        onStartTimer={handleStartTimer}
        onStopTimer={handleStopTimer}
        setNodeRef={setNodeRef}
        formatRemaining={formatRemaining}
        formatMinutesLabel={formatMinutesLabel}
        tr={tr}
      />
    </>
  );
};
