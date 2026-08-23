import { useEffect, useState } from 'react';
import type { RSIPTreeNode } from '../../../types';
import type { CanvasState } from '../../../hooks/useCanvasState';
import type { RSIPConnector } from '../RSIPTree';
import type { NodePosition } from './useRSIPLayout';

const RSIP_NODE_WIDTH = 256;
const RSIP_NODE_SPACING_PADDING_Y = 40;

type AnchorSide = 'left' | 'right' | 'top' | 'bottom';
type Point = { x: number; y: number };

interface UseRSIPConnectorsParams {
  filteredTree: RSIPTreeNode[];
  nodePositions: Record<string, NodePosition>;
  hoveredChainIds: Set<string>;
  layoutNodeHeight: number;
  containerRef: React.RefObject<HTMLDivElement>;
  nodeRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  latestTransformRef: React.MutableRefObject<CanvasState>;
}

function getAnchorPoint(
  left: number,
  top: number,
  width: number,
  height: number,
  side: AnchorSide,
): Point {
  switch (side) {
    case 'left':
      return { x: left, y: top + height / 2 };
    case 'right':
      return { x: left + width, y: top + height / 2 };
    case 'top':
      return { x: left + width / 2, y: top };
    case 'bottom':
      return { x: left + width / 2, y: top + height };
  }
}

function isVerticalConnector(parent: RSIPTreeNode, child: RSIPTreeNode) {
  return Boolean(parent.groupId && parent.groupId === child.groupId);
}

function createConnectorPath(
  start: Point,
  end: Point,
  isVertical: boolean,
): string {
  const distance = isVertical ? end.y - start.y : end.x - start.x;
  const bend = Math.max(40, Math.abs(distance) * 0.5);

  return isVertical
    ? `M ${start.x} ${start.y} C ${start.x} ${start.y + bend} ${end.x} ${end.y - bend} ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} C ${start.x + bend} ${start.y} ${end.x - bend} ${end.y} ${end.x} ${end.y}`;
}

export function useRSIPConnectors({
  filteredTree,
  nodePositions,
  hoveredChainIds,
  layoutNodeHeight,
  containerRef,
  nodeRefs,
  latestTransformRef,
}: UseRSIPConnectorsParams): RSIPConnector[] {
  const [connectors, setConnectors] = useState<RSIPConnector[]>([]);

  useEffect(() => {
    const compute = () => {
      const container = containerRef.current;
      if (!container) return;
      const newConnectors: RSIPConnector[] = [];

      const getAnchor = (nodeId: string, side: AnchorSide): Point => {
        const position = nodePositions[nodeId];
        if (!position) return { x: 0, y: 0 };

        const element = nodeRefs.current[nodeId];
        if (!element) {
          return getAnchorPoint(
            Number(position.style.left) || 0,
            Number(position.style.top) || 0,
            RSIP_NODE_WIDTH,
            Math.max(120, layoutNodeHeight - RSIP_NODE_SPACING_PADDING_Y),
            side,
          );
        }

        const nodeRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const scale = latestTransformRef.current.scale || 1;
        return getAnchorPoint(
          (nodeRect.left - containerRect.left) / scale,
          (nodeRect.top - containerRect.top) / scale,
          nodeRect.width / scale,
          nodeRect.height / scale,
          side,
        );
      };

      const addConnector = (node: RSIPTreeNode, child: RSIPTreeNode) => {
        if (!nodePositions[node.id] || !nodePositions[child.id]) return;

        const isVertical = isVerticalConnector(node, child);
        const start = getAnchor(node.id, isVertical ? 'bottom' : 'right');
        const end = getAnchor(child.id, isVertical ? 'top' : 'left');
        newConnectors.push({
          id: `${node.id}_${child.id}`,
          d: createConnectorPath(start, end, isVertical),
          isHovered:
            hoveredChainIds.has(node.id) && hoveredChainIds.has(child.id),
        });
      };

      const walk = (node: RSIPTreeNode) => {
        node.children.forEach((child) => {
          addConnector(node, child);
          walk(child);
        });
      };

      filteredTree.forEach(walk);
      setConnectors(newConnectors);
    };

    compute();
    const timer = setTimeout(compute, 50);
    window.addEventListener('resize', compute);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', compute);
    };
  }, [
    filteredTree,
    hoveredChainIds,
    nodePositions,
    layoutNodeHeight,
    containerRef,
    nodeRefs,
    latestTransformRef,
  ]);

  return connectors;
}
