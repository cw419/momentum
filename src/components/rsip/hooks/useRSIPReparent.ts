import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RSIPNode, RSIPTreeNode } from '../../../types';

export interface UseRSIPReparentParams {
  nodes: RSIPNode[];
  tree: RSIPTreeNode[];
  nodesById: Map<string, RSIPNode>;
  onSaveNodes: (nodes: RSIPNode[]) => void;
  tr: (zh: string, en: string) => string;
}

export interface UseRSIPReparentResult {
  reparentingId: string | null;
  reparentingTitle: string | null;
  relationError: string | null;
  invalidParentIds: Set<string>;
  hoveredChainIds: Set<string>;
  pinnedId: string | null;
  hoveredId: string | null;
  togglePinned: (nodeId: string) => void;
  handleHoverStart: (nodeId: string) => void;
  handleHoverEnd: () => void;
  toggleReparenting: (nodeId: string) => void;
  commitReparent: (childId: string, parentId?: string) => void;
  cancelReparent: () => void;
  setRelationError: (error: string | null) => void;
}

export function useRSIPReparent({
  nodes,
  tree,
  nodesById,
  onSaveNodes,
  tr,
}: UseRSIPReparentParams): UseRSIPReparentResult {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [reparentingId, setReparentingId] = useState<string | null>(null);
  const [relationError, setRelationError] = useState<string | null>(null);
  const [hoveredChainIds, setHoveredChainIds] = useState<Set<string>>(new Set());

  const reparentingTitle = useMemo(() => {
    if (!reparentingId) return null;
    return nodesById.get(reparentingId)?.title ?? reparentingId;
  }, [nodesById, reparentingId]);

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

  const getAncestors = useMemo(
    () =>
      (id?: string | null): string[] => {
        const res: string[] = [];
        let cur = id ? nodesById.get(id) : undefined;
        while (cur && cur.parentId) {
          res.push(cur.parentId);
          cur = nodesById.get(cur.parentId);
        }
        return res;
      },
    [nodesById]
  );

  const getDescendantsFromTree = useMemo(
    () =>
      (id: string): string[] => {
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
      },
    [tree]
  );

  const invalidParentIds = useMemo(() => {
    if (!reparentingId) return new Set<string>();
    return new Set([reparentingId, ...getDescendantsFromTree(reparentingId)]);
  }, [getDescendantsFromTree, reparentingId]);

  const commitReparent = useCallback(
    (childId: string, parentId?: string) => {
      if (childId === parentId) {
        setRelationError(tr('不能选择自身作为父节点。', 'Cannot select the node itself as parent.'));
        return;
      }
      if (parentId) {
        const descendants = getDescendantsFromTree(childId);
        if (descendants.includes(parentId)) {
          setRelationError(
            tr('不能把节点移动到自己的后代下面。', 'Cannot move a node under its descendant.')
          );
          return;
        }
      }

      const updated = nodes.map(n =>
        n.id === childId ? { ...n, parentId: parentId || undefined } : n
      );
      onSaveNodes(updated);
      setPinnedId(childId);
      setReparentingId(null);
      setRelationError(null);
    },
    [getDescendantsFromTree, nodes, onSaveNodes, tr]
  );

  const cancelReparent = useCallback(() => {
    setReparentingId(null);
    setRelationError(null);
  }, []);

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

  return {
    reparentingId,
    reparentingTitle,
    relationError,
    invalidParentIds,
    hoveredChainIds,
    pinnedId,
    hoveredId,
    togglePinned,
    handleHoverStart,
    handleHoverEnd,
    toggleReparenting,
    commitReparent,
    cancelReparent,
    setRelationError,
  };
}
