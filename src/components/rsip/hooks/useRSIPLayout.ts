import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RSIPNode, RSIPNodeGroup, RSIPTreeNode } from '../../../types';
import { buildRSIPTree } from '../../../utils/rsipTree';

const MIN_RSIP_NODE_SPACING_Y = 220;
const RSIP_NODE_SPACING_PADDING_Y = 40;
const LEVEL_WIDTH = 320;
const START_X = 20;
const START_Y = 20;
const RSIP_NODE_WIDTH = 256;
const GROUP_NODE_GAP_X = 64;
const GROUP_FRAME_PADDING = 18;
const GROUP_LABEL_SPACE = 42;
const EMPTY_GROUPS: RSIPNodeGroup[] = [];

export interface NodePosition {
  node: RSIPTreeNode;
  style: React.CSSProperties;
}

export interface RSIPGroupFrame {
  id: string;
  title: string;
  emoji?: string;
  style: React.CSSProperties;
}

interface UseRSIPLayoutResult {
  nodePositions: Record<string, NodePosition>;
  containerHeight: number;
  layoutNodeHeight: number;
  groupFrames: RSIPGroupFrame[];
  filteredTree: RSIPTreeNode[];
  nodesById: Map<string, RSIPNode>;
  nodeRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  setNodeRef: (nodeId: string, el: HTMLDivElement | null) => void;
}

export function useRSIPLayout(
  nodes: RSIPNode[],
  tree: RSIPTreeNode[],
  filterType: string | null,
  groups: RSIPNodeGroup[] = EMPTY_GROUPS,
): UseRSIPLayoutResult {
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [layoutNodeHeight, setLayoutNodeHeight] = useState<number>(
    MIN_RSIP_NODE_SPACING_Y,
  );
  const [nodePositions, setNodePositions] = useState<
    Record<string, NodePosition>
  >({});
  const [containerHeight, setContainerHeight] = useState<number>(600);
  const [groupFrames, setGroupFrames] = useState<RSIPGroupFrame[]>([]);

  const setNodeRef = useCallback(
    (nodeId: string, el: HTMLDivElement | null) => {
      nodeRefs.current[nodeId] = el;
    },
    [],
  );

  const nodesById = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  const filteredTree = useMemo(() => {
    if (!filterType) return tree;
    const filteredNodes = new Set(
      nodes.filter((n) => (n.type || 'policy') === filterType).map((n) => n.id),
    );
    if (filteredNodes.size === 0) return [];

    const visibleNodes = new Set<string>();
    filteredNodes.forEach((id) => {
      let current = nodesById.get(id);
      while (current) {
        visibleNodes.add(current.id);
        current = current.parentId
          ? nodesById.get(current.parentId)
          : undefined;
      }
    });

    const finalNodes = nodes.filter((n) => visibleNodes.has(n.id));
    return buildRSIPTree(finalNodes);
  }, [tree, filterType, nodes, nodesById]);

  useEffect(() => {
    if (filteredTree.length === 0) {
      setNodePositions({});
      setContainerHeight(200);
      setGroupFrames([]);
      return;
    }

    const positions: Record<string, NodePosition> = {};
    const NODE_HEIGHT = layoutNodeHeight;
    const CARD_HEIGHT = Math.max(
      120,
      layoutNodeHeight - RSIP_NODE_SPACING_PADDING_Y,
    );
    let currentY = START_Y;

    const layout = (node: RSIPTreeNode, depth: number): number => {
      if (node.children.length === 0) {
        const y = currentY;
        positions[node.id] = {
          node,
          style: { left: START_X + depth * LEVEL_WIDTH, top: y },
        };
        currentY += NODE_HEIGHT;
        return y;
      }

      const childYs: number[] = [];
      node.children.forEach((child) => {
        childYs.push(layout(child, depth + 1));
      });

      const minY = Math.min(...childYs);
      const maxY = Math.max(...childYs);
      const y = (minY + maxY) / 2;

      positions[node.id] = {
        node,
        style: { left: START_X + depth * LEVEL_WIDTH, top: y },
      };
      return y;
    };

    filteredTree.forEach((root) => {
      layout(root, 0);
      currentY += 40;
    });

    const groupMembers = groups
      .map((group) => ({
        group,
        members: Object.values(positions)
          .map(({ node }) => node)
          .filter((node) => node.groupId === group.id),
      }))
      .filter(({ members }) => members.length > 0)
      .sort(
        (left, right) =>
          Math.min(
            ...left.members.map(
              (node) => Number(positions[node.id]?.style.top) || 0,
            ),
          ) -
          Math.min(
            ...right.members.map(
              (node) => Number(positions[node.id]?.style.top) || 0,
            ),
          ),
      );

    for (const { members } of groupMembers) {
      const memberIds = new Set(members.map((node) => node.id));
      const childrenByParent = new Map<string, RSIPTreeNode[]>();
      members.forEach((node) => {
        if (!node.parentId || !memberIds.has(node.parentId)) return;
        const children = childrenByParent.get(node.parentId) ?? [];
        children.push(node);
        childrenByParent.set(node.parentId, children);
      });
      childrenByParent.forEach((children) => {
        children.sort((left, right) => left.sortOrder - right.sortOrder);
      });

      const roots = members
        .filter((node) => !node.parentId || !memberIds.has(node.parentId))
        .sort((left, right) => left.sortOrder - right.sortOrder);
      const branchWidths = new Map<string, number>();
      const getBranchWidth = (node: RSIPTreeNode): number => {
        const cached = branchWidths.get(node.id);
        if (cached) return cached;
        const children = childrenByParent.get(node.id) ?? [];
        const width = children.length
          ? children.reduce((total, child) => total + getBranchWidth(child), 0)
          : 1;
        branchWidths.set(node.id, width);
        return width;
      };

      const originalTop = Math.min(
        ...members.map((node) => Number(positions[node.id]?.style.top) || 0),
      );
      const originalBottom = Math.max(
        ...members.map(
          (node) => (Number(positions[node.id]?.style.top) || 0) + CARD_HEIGHT,
        ),
      );
      const baseCenterX =
        Math.min(
          ...members.map(
            (node) => Number(positions[node.id]?.style.left) || START_X,
          ),
        ) +
        RSIP_NODE_WIDTH / 2;
      const layoutGroupBranch = (
        node: RSIPTreeNode,
        startColumn: number,
        level: number,
      ) => {
        const width = getBranchWidth(node);
        const position = positions[node.id];
        if (!position) return;
        position.style = {
          ...position.style,
          left:
            baseCenterX +
            (startColumn + width / 2 - 0.5) *
              (RSIP_NODE_WIDTH + GROUP_NODE_GAP_X) -
            RSIP_NODE_WIDTH / 2,
          top: originalTop + level * NODE_HEIGHT,
        };

        let childColumn = startColumn;
        for (const child of childrenByParent.get(node.id) ?? []) {
          layoutGroupBranch(child, childColumn, level + 1);
          childColumn += getBranchWidth(child);
        }
      };

      let rootColumn = 0;
      roots.forEach((root) => {
        layoutGroupBranch(root, rootColumn, 0);
        rootColumn += getBranchWidth(root);
      });

      const newBottom = Math.max(
        ...members.map(
          (node) => (Number(positions[node.id]?.style.top) || 0) + CARD_HEIGHT,
        ),
      );
      const verticalShift = Math.max(0, newBottom - originalBottom);
      if (verticalShift > 0) {
        Object.values(positions).forEach((position) => {
          if (
            memberIds.has(position.node.id) ||
            (Number(position.style.top) || 0) <= originalTop
          ) {
            return;
          }
          position.style = {
            ...position.style,
            top: (Number(position.style.top) || 0) + verticalShift,
          };
        });
      }
    }

    const groupFrameItems = groupMembers.map(({ group, members }) => {
      const memberPositions = members
        .map((node) => positions[node.id])
        .filter((position): position is NodePosition => Boolean(position));
      const minX = Math.min(
        ...memberPositions.map((position) => Number(position.style.left) || 0),
      );
      const minY = Math.min(
        ...memberPositions.map((position) => Number(position.style.top) || 0),
      );
      const maxX = Math.max(
        ...memberPositions.map(
          (position) => (Number(position.style.left) || 0) + RSIP_NODE_WIDTH,
        ),
      );
      const maxY = Math.max(
        ...memberPositions.map(
          (position) => (Number(position.style.top) || 0) + CARD_HEIGHT,
        ),
      );

      return {
        id: group.id,
        title: group.title,
        emoji: group.emoji,
        style: {
          left: minX - GROUP_FRAME_PADDING,
          top: minY - GROUP_FRAME_PADDING,
          width: maxX - minX + GROUP_FRAME_PADDING * 2,
          height: maxY - minY + GROUP_FRAME_PADDING * 2 + GROUP_LABEL_SPACE,
        },
      };
    });

    setNodePositions(positions);
    setGroupFrames(groupFrameItems);
    const nodeBottom = Math.max(
      ...Object.values(positions).map(
        ({ style }) => (Number(style.top) || 0) + CARD_HEIGHT,
      ),
    );
    const frameBottom = Math.max(
      currentY + 100,
      nodeBottom,
      ...groupFrameItems.map(
        (frame) =>
          (Number(frame.style.top) || 0) + (Number(frame.style.height) || 0),
      ),
    );
    setContainerHeight(Math.max(600, frameBottom + 80));
  }, [filteredTree, groups, layoutNodeHeight]);

  useEffect(() => {
    const measureAndUpdate = () => {
      const heights = Object.values(nodeRefs.current)
        .map((el) => el?.offsetHeight ?? 0)
        .filter((h) => h > 0);
      if (heights.length === 0) return;

      const maxCardHeight = Math.max(...heights);
      const nextSpacing = Math.max(
        MIN_RSIP_NODE_SPACING_Y,
        Math.ceil(maxCardHeight + RSIP_NODE_SPACING_PADDING_Y),
      );

      setLayoutNodeHeight((prev) => (nextSpacing > prev ? nextSpacing : prev));
    };

    const raf = window.requestAnimationFrame(measureAndUpdate);
    window.addEventListener('resize', measureAndUpdate);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', measureAndUpdate);
    };
  }, [nodePositions]);

  return {
    nodePositions,
    containerHeight,
    layoutNodeHeight,
    groupFrames,
    filteredTree,
    nodesById,
    nodeRefs,
    setNodeRef,
  };
}
