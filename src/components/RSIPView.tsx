import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RSIPNode, RSIPTreeNode, RSIPMeta } from '../types';
import { buildRSIPTree, countDescendants, deleteNodeAndDescendants } from '../utils/rsipTree';
import { ArrowLeft, Clock, CornerUpLeft, Link2, Maximize2, Minus, Play, Plus, Trash2, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useCanvasState, type CanvasState } from '../hooks/useCanvasState';

const MIN_RSIP_NODE_SPACING_Y = 220;
const RSIP_NODE_SPACING_PADDING_Y = 40;

interface RSIPViewProps {
  nodes: RSIPNode[];
  meta: RSIPMeta;
  onBack: () => void;
  onSaveNodes: (nodes: RSIPNode[]) => void;
  onSaveMeta: (meta: RSIPMeta) => void;
}

export const RSIPView: React.FC<RSIPViewProps> = ({ nodes, meta, onBack, onSaveNodes, onSaveMeta }) => {
  const { language, tr } = useI18n();
  const tree = useMemo<RSIPTreeNode[]>(() => buildRSIPTree(nodes), [nodes]);
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [rule, setRule] = useState('');
  const { savedState, isLoaded, saveCanvasState } = useCanvasState();

  const canAddToday = (() => {
    if (meta.allowMultiplePerDay) return true;
    if (!meta.lastAddedAt) return true;
    const last = new Date(meta.lastAddedAt);
    const now = new Date();
    return last.toDateString() !== now.toDateString();
  })();

  const handleAdd = () => {
    if (!canAddToday) return;
    if (!title.trim() || !rule.trim()) return;
    const newNode: RSIPNode = {
      id: crypto.randomUUID(),
      parentId: selectedParentId || undefined,
      title: title.trim(),
      rule: rule.trim(),
      sortOrder: Math.floor(Date.now() / 1000),
      createdAt: new Date(),
      useTimer: createUseTimer,
      timerMinutes: createUseTimer ? createTimerMinutes : undefined,
      type: createType,
      emoji: createEmoji,
    };
    const newNodes = [...nodes, newNode];
    onSaveNodes(newNodes);
    onSaveMeta({ ...meta, lastAddedAt: new Date() });
    setTitle('');
    setRule('');
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
    const confirmText = tr(
      `判定失败：将删除「${node.title}」及其 ${descendants} 个子节点。确认回溯？`,
      `Marked as failed: this will delete "${node.title}" and its ${descendants} child node${descendants === 1 ? '' : 's'}. Roll back?`
    );
    if (!confirm(confirmText)) return;
    const newNodes = deleteNodeAndDescendants(nodes, nodeId);
    onSaveNodes(newNodes);
  };

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
  }, [now, activeTimers]);

  const formatRemaining = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleStartTimer = (nodeId: string, minutes: number) => {
    const endsAt = Date.now() + minutes * 60 * 1000;
    setActiveTimers(prev => ({ ...prev, [nodeId]: endsAt }));
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handleStopTimer = (nodeId: string) => {
    if (confirm(tr('确定要停止计时吗？', 'Stop the timer?'))) {
      setActiveTimers(prev => {
        const copy = { ...prev };
        delete copy[nodeId];
        return copy;
      });
    }
  };

  const formatMinutesLabel = (minutes: number) => {
    return tr(`${minutes} 分钟`, `${minutes} min`);
  };

  // 新增：用于 Civ6 风格横向卡片渲染（不递归渲染子节点）
  const renderPolicyCard = (node: RSIPTreeNode, style: React.CSSProperties = {}) => {
    const ntype = node.type || 'policy';
    const color = typeColorMap[ntype] || typeColorMap.policy;
    const isInvalidParent = !!reparentingId && invalidParentIds.has(node.id);
    const isReparentingChild = reparentingId === node.id;
    
    const endsAt = activeTimers[node.id];
    const isRunning = endsAt && endsAt > now;
    const remaining = isRunning ? endsAt - now : 0;
    const timerMinutes = node.timerMinutes || 15;

    const baseZ = Number(style.top) || 0;
    const zIndex = reparentingId === node.id
      ? 90
      : pinnedId === node.id
        ? 80
        : hoveredChainIds.has(node.id)
          ? 70
          : 10 + Math.floor(baseZ / 10);

    return (
      <div
        ref={el => nodeRefs.current[node.id] = el}
        key={node.id}
        style={{ ...style, zIndex }}
        onClick={() => {
          if (reparentingId) {
            if (isInvalidParent) {
              setRelationError(tr('不能选择该节点作为父节点（会形成循环）。', 'Cannot choose this node as parent (would create a cycle).'));
              return;
            }
            commitReparent(reparentingId, node.id);
            return;
          }
          setPinnedId(prev => prev === node.id ? null : node.id);
        }}
        onMouseEnter={() => setHoveredId(node.id)}
        onMouseLeave={() => setHoveredId(null)}
        className={`rsip-node absolute w-64 rounded-2xl p-4 backdrop-blur-sm shadow-lg transition-all duration-300 transform-gpu ${color.bg} ${color.border} ${hoveredChainIds.has(node.id) ? `ring-2 ${color.ring} scale-105 shadow-2xl` : ''} ${isInvalidParent ? 'opacity-40 saturate-50 cursor-not-allowed' : 'cursor-pointer'} ${isReparentingChild ? 'ring-2 ring-emerald-400 dark:ring-emerald-500 shadow-2xl' : ''}`}
      >
        <div className="flex items-start space-x-3">
          <div className="text-3xl leading-none pt-1" aria-hidden>
            {node.emoji || '📝'}
          </div>
          <div className="flex-1">
            <h4 className="text-md font-bold font-chinese text-gray-900 dark:text-slate-100 rsip-title-clamp">{node.title}</h4>
            <p className="text-xs text-gray-600 dark:text-slate-400 font-chinese rsip-rule-clamp mt-1">{node.rule}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-2">
            {node.useTimer && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isRunning) {
                    handleStopTimer(node.id);
                  } else {
                    handleStartTimer(node.id, node.timerMinutes || 15);
                  }
                }}
                className={`inline-flex items-center text-xs px-2 py-1 rounded-xl transition-colors ${isRunning ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 animate-pulse' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'}`}
              >
                {isRunning ? (
                  <>
                    <Clock size={12} className="mr-1" /> {formatRemaining(remaining)}
                  </>
                ) : (
                  <>
                    <Play size={12} className="mr-1" /> {formatMinutesLabel(timerMinutes)}
                  </>
                )}
              </button>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPinnedId(node.id);
                setRelationError(null);
                setReparentingId(prev => prev === node.id ? null : node.id);
              }}
              className={`p-1.5 rounded-lg transition-colors ${reparentingId === node.id ? 'text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-700' : 'text-gray-500 hover:text-gray-700 dark:text-slate-300 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
              title={reparentingId === node.id ? tr('取消更改继承', 'Cancel reparent') : tr('更改继承关系', 'Change parent')}
              aria-label={reparentingId === node.id ? tr('取消更改继承', 'Cancel reparent') : tr('更改继承关系', 'Change parent')}
            >
              {reparentingId === node.id ? <X size={14} /> : <Link2 size={14} />}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleFailure(node.id); }}
              className="p-1.5 text-red-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              title={tr('判定失败（删除此节点及其所有子节点）', 'Mark as failed (delete this node and all descendants)')}
              aria-label={tr('判定失败', 'Mark as failed')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const flatForSelect = (arr: RSIPTreeNode[]): RSIPTreeNode[] => {
    const res: RSIPTreeNode[] = [];
    const walk = (n: RSIPTreeNode) => { res.push(n); n.children.forEach(walk); };
    arr.forEach(walk);
    return res;
  };

  // Create form state for timer and daily policy
  const [createUseTimer, setCreateUseTimer] = useState<boolean>(false);
  const [createTimerMinutes, setCreateTimerMinutes] = useState<number>(15);
  const [createType, setCreateType] = useState<string>('policy');
  const [createEmoji, setCreateEmoji] = useState<string>('📝');

  // 预设类型 -> emoji 映射
  const typeEmojiMap: Record<string, string> = { policy: '📝', habit: '🔄', reward: '🌟', penalty: '❌', ritual: '🧘', goal: '🏁', trigger: '➡️', reminder: '⏰' };
  
  // 类型标签映射
  const typeLabelMap: Record<string, { zh: string; en: string }> = {
    policy: { zh: '国策', en: 'Policy' },
    habit: { zh: '习惯', en: 'Habit' },
    reward: { zh: '奖励', en: 'Reward' },
    penalty: { zh: '惩罚', en: 'Penalty' },
    ritual: { zh: '仪式', en: 'Ritual' },
    goal: { zh: '目标', en: 'Goal' },
    trigger: { zh: '触发器', en: 'Trigger' },
    reminder: { zh: '提醒', en: 'Reminder' },
  };

  const getTypeLabel = (type: string) => {
    const label = typeLabelMap[type];
    if (!label) return type;
    return language === 'zh' ? label.zh : label.en;
  };

  // 颜色映射：类型 -> 徽章/环/背景样式
  const typeColorMap: Record<string, { badge: string; ring: string; bg: string; border: string; }> = {
    policy: { badge: 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200', ring: 'ring-gray-400 dark:ring-gray-500', bg: 'bg-gray-100 dark:bg-slate-800', border: 'border-gray-300 dark:border-slate-600' },
    habit: { badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200', ring: 'ring-blue-400 dark:ring-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-300 dark:border-blue-700' },
    reward: { badge: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200', ring: 'ring-yellow-400 dark:ring-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/40', border: 'border-yellow-300 dark:border-yellow-700' },
    penalty: { badge: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200', ring: 'ring-red-400 dark:ring-red-600', bg: 'bg-red-100 dark:bg-red-900/40', border: 'border-red-300 dark:border-red-700' },
    ritual: { badge: 'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-200', ring: 'ring-pink-400 dark:ring-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/40', border: 'border-pink-300 dark:border-pink-700' },
    goal: { badge: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200', ring: 'ring-emerald-400 dark:ring-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-300 dark:border-emerald-700' },
    trigger: { badge: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200', ring: 'ring-indigo-400 dark:ring-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/40', border: 'border-indigo-300 dark:border-indigo-700' },
    reminder: { badge: 'bg-violet-100 dark:bg-violet-900/20 text-violet-800 dark:text-violet-200', ring: 'ring-violet-400 dark:ring-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/40', border: 'border-violet-300 dark:border-violet-700' },
  };

  const [filterType, setFilterType] = useState<string | null>(null);

  // 新增：SVG 连线与 hover 高亮的支持（支持 enter/exit 动画、链路高亮与拖拽）
  type Connector = { id: string; d: string; isHovered: boolean };
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const connectorRefs = useRef<Record<string, SVGPathElement | null>>({});
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [reparentingId, setReparentingId] = useState<string | null>(null);
  const [relationError, setRelationError] = useState<string | null>(null);
  const [hoveredChainIds, setHoveredChainIds] = useState<Set<string>>(new Set());
  
  // 布局状态
  const [layoutNodeHeight, setLayoutNodeHeight] = useState<number>(MIN_RSIP_NODE_SPACING_Y);
  const [nodePositions, setNodePositions] = useState<Record<string, { node: RSIPTreeNode; style: React.CSSProperties }>>({});
  const [containerHeight, setContainerHeight] = useState<number>(600);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const latestTransformRef = useRef<CanvasState>({ scale: 1, positionX: 0, positionY: 0 });
  const didInitCameraRef = useRef(false);

  // 辅助：基于 nodes（扁平）快速查找父链
  const nodesById = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  // 过滤后的树
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

  // 核心布局算法：计算每个节点的绝对位置 (top, left)
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

    // 1. 计算每个节点的深度和子树高度（以叶子节点数为单位）
    // const measure = (node: RSIPTreeNode, depth: number): number => {
    //   if (node.children.length === 0) {
    //     return 1;
    //   }
    //   let leaves = 0;
    //   node.children.forEach(child => {
    //     leaves += measure(child, depth + 1);
    //   });
    //   return leaves;
    // };

    // 2. 递归分配位置
    let currentY = START_Y;
    
    const layout = (node: RSIPTreeNode, depth: number): number => {
      // 如果是叶子节点，分配当前Y，并推进Y
      if (node.children.length === 0) {
        const y = currentY;
        positions[node.id] = {
          node,
          style: { left: START_X + depth * LEVEL_WIDTH, top: y }
        };
        currentY += NODE_HEIGHT;
        return y;
      }

      // 如果有子节点，先布局子节点
      const childYs: number[] = [];
      node.children.forEach(child => {
        childYs.push(layout(child, depth + 1));
      });

      // 父节点Y为子节点Y的平均值（居中）
      const minY = Math.min(...childYs);
      const maxY = Math.max(...childYs);
      const y = (minY + maxY) / 2;

      positions[node.id] = {
        node,
        style: { left: START_X + depth * LEVEL_WIDTH, top: y }
      };
      return y;
    };

    // 对每个根节点（宗族）进行布局
    filteredTree.forEach(root => {
      layout(root, 0);
      // 宗族之间增加额外间距
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
      const nextSpacing = Math.max(
        MIN_RSIP_NODE_SPACING_Y,
        Math.ceil(maxCardHeight + RSIP_NODE_SPACING_PADDING_Y)
      );

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
    const walk = (n: RSIPTreeNode) => { n.children.forEach(c => { res.push(c.id); walk(c); }); };
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

    const updated = nodes.map(n => n.id === childId ? { ...n, parentId: parentId || undefined } : n);
    onSaveNodes(updated);
    setPinnedId(childId);
    setReparentingId(null);
    setRelationError(null);
  }, [getDescendantsFromTree, nodes, onSaveNodes, tr]);

  const cancelReparent = useCallback(() => {
    setReparentingId(null);
    setRelationError(null);
  }, []);

  // hover chain计算：包括祖先与所有后代
  useEffect(() => {
    const activeId = reparentingId ?? pinnedId ?? hoveredId;
    if (!activeId) { setHoveredChainIds(new Set()); return; }
    const ids = new Set<string>();
    ids.add(activeId);
    getAncestors(activeId).forEach(id => ids.add(id));
    getDescendantsFromTree(activeId).forEach(id => ids.add(id));
    setHoveredChainIds(ids);
  }, [hoveredId, pinnedId, reparentingId, getAncestors, getDescendantsFromTree]);

  // 计算连接线的路径
  useEffect(() => {
    const compute = () => {
      const container = containerRef.current;
      if (!container) return;
      // const crect = container.getBoundingClientRect(); // No longer needed for absolute positioning relative to container
      const newConnectors: Connector[] = [];

      // Helper to get anchor point from node position
      const getAnchor = (nodeId: string, side: 'left' | 'right') => {
        const pos = nodePositions[nodeId];
        if (!pos) return { x: 0, y: 0 };
        
        // Card dimensions (w-64 = 256px, p-4 implies height varies but we can estimate or measure)
        // For simplicity, we use the center of the card based on known width and estimated height
        // Or better, use the actual DOM element if available, but fallback to calculated position
        
        const el = nodeRefs.current[nodeId];
         if (el) {
            // Use actual DOM element relative to container
            const elRect = el.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const scale = latestTransformRef.current.scale || 1;
            
            const x = side === 'left' 
              ? (elRect.left - containerRect.left) / scale
              : (elRect.right - containerRect.left) / scale;
            const y = ((elRect.top - containerRect.top) + elRect.height / 2) / scale;
            return { x, y };
         }
        
        // Fallback to calculated style
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
    
    // Run compute immediately and after a short delay to allow DOM to settle
    compute();
    const t = setTimeout(compute, 50); 
    window.addEventListener('resize', compute);
    return () => { clearTimeout(t); window.removeEventListener('resize', compute); };
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
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto relative">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <button onClick={onBack} className="p-3 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 rounded-2xl hover:bg-white/60 dark:hover:bg-slate-800/60">
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-chinese text-gray-900 dark:text-slate-100">
                {tr('国策树 · RSIP', 'RSIP Policy Tree')}
              </h1>
              <p className="text-xs font-mono text-gray-600 dark:text-slate-400 tracking-wider uppercase">
                {tr('递归稳定迭代协议', 'Recursive Stabilization Iteration Protocol')}
              </p>
            </div>
          </div>
          {/* Daily policy toggle */}
          <div className="flex items-center space-x-3">
            <span className="text-xs font-chinese text-gray-600 dark:text-slate-400">{tr('一天可多条', 'Multiple per day')}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!meta.allowMultiplePerDay}
                onChange={(e) => onSaveMeta({ ...meta, allowMultiplePerDay: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </header>

        {/* First-time empty state */}
        {nodes.length === 0 && (
          <div className="bento-card max-w-3xl mx-auto mb-8">
            <h2 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-3">
              {tr('开始你的第一条国策', 'Create your first policy')}
            </h2>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed font-chinese">
              {tr(
                'RSIP 强调通过「每天至多新增一个、失败即回溯」来稳定迭代你的生活定式。选择一个小而稳的起点，建立第一条国策吧。',
                'RSIP stabilizes your routines by adding at most one item per day and rolling back on failure. Start small and steady—create your first policy.'
              )}
            </p>
          </div>
        )}

        {/* Add form */}
        <div className="bento-card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">
                {tr('父节点（可空，表示新分支）', 'Parent (optional; empty = new branch)')}
              </label>
              <select
                value={selectedParentId || ''}
                onChange={e => setSelectedParentId(e.target.value || undefined)}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
              >
                <option value="">{tr('（无父节点，建立新根）', '(No parent; create new root)')}</option>
                {flatForSelect(tree).map(n => (
                  <option key={n.id} value={n.id}>{'— '.repeat(n.depth)}{n.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">{tr('国策标题', 'Policy title')}</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={tr('例如：进门15分钟内开始洗澡', 'e.g. Start showering within 15 minutes of getting home')}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">{tr('精准规则', 'Rule')}</label>
              <input
                value={rule}
                onChange={e => setRule(e.target.value)}
                placeholder={tr('例如：回家即启动15分钟计时，计时内进浴室', 'e.g. Start a 15-minute timer when home; enter the bathroom before it ends')}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
              />
            </div>
          </div>
          {/* Timer settings */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between bento-subtle px-4 py-3 rounded-2xl">
              <div className="flex items-center space-x-2">
                <Clock size={16} className="text-emerald-600" />
                <span className="text-sm font-chinese text-gray-700 dark:text-slate-300">{tr('启用计时', 'Enable timer')}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={createUseTimer}
                  onChange={(e) => setCreateUseTimer(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            <div className={`${createUseTimer ? '' : 'opacity-60'}`}>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">
                {tr('计时分钟数', 'Timer minutes')}
              </label>
              <input
                type="number"
                min={1}
                max={180}
                disabled={!createUseTimer}
                value={createTimerMinutes}
                onChange={(e) => setCreateTimerMinutes(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300 font-chinese"
              />
            </div>
          </div>
          {/* 新增：类型与 Emoji 选择 */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">{tr('节点类型', 'Node type')}</label>
              <select
                value={createType}
                onChange={e => {
                  const t = e.target.value;
                  setCreateType(t);
                  setCreateEmoji(typeEmojiMap[t] || '📜');
                }}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-3 py-2 text-gray-900 dark:text-slate-100 focus:outline-none transition-all duration-200 font-chinese"
              >
                {Object.entries(typeEmojiMap).map(([type, emoji]) => (
                  <option key={type} value={type}>{emoji} {getTypeLabel(type)} ({type})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm font-chinese text-gray-600 dark:text-slate-400">
              {meta.allowMultiplePerDay
                ? tr('已开启“一天可多条”。今日可继续新增。', 'Multiple per day is enabled. You can add more today.')
                : tr('每天最多新增一个国策。', 'Add at most one policy per day.')}{' '}
              {!meta.allowMultiplePerDay && (canAddToday ? tr('今日可新增。', 'You can add today.') : tr('今日已新增，明日继续。', 'Already added today. Try again tomorrow.'))}
            </div>
            <button
              onClick={handleAdd}
              disabled={!canAddToday || !title.trim() || !rule.trim()}
              className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-medium transition-all duration-300 shadow-lg ${(!canAddToday || !title.trim() || !rule.trim()) ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500' : 'gradient-primary text-white hover:shadow-xl hover:scale-105'}`}
            >
              <Plus size={18} />
              <span className="font-chinese">{tr('新增国策', 'Add policy')}</span>
            </button>
          </div>
        </div>

        {/* 过滤与图例栏 */}
        <div className="bento-card mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <label className="text-sm font-chinese text-gray-700 dark:text-slate-300">{tr('按类型筛选：', 'Filter by type:')}</label>
              <select value={filterType || ''} onChange={e => setFilterType(e.target.value || null)} className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-3 py-2 text-gray-900 dark:text-slate-100">
                <option value="">{tr('全部', 'All')}</option>
                {Object.keys(typeEmojiMap).map(t => <option key={t} value={t}>{getTypeLabel(t)}</option>)}
              </select>
              <button type="button" onClick={() => setFilterType(null)} className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-xs">{tr('清除', 'Clear')}</button>
            </div>
            <div className="flex items-center space-x-2">
              {Object.keys(typeColorMap).map(t => {
                const col = typeColorMap[t];
                return (
                  <div key={t} className={`px-2 py-1 rounded-lg ${col.badge} text-xs font-chinese`}>{getTypeLabel(t)}</div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tree */}
        <div ref={viewportRef} className="relative w-full h-[60vh] min-h-[400px]">
          {tree.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-600 dark:text-slate-400 font-chinese">
              {tr('尚无国策，先从上方表单添加一个吧。', 'No policies yet. Add one from the form above.')}
            </div>
          ) : (
            <TransformWrapper
              ref={transformRef}
              initialScale={1}
              initialPositionX={0}
              initialPositionY={0}
              minScale={0.1}
              maxScale={2}
              limitToBounds={false}
              panning={{ excluded: ['rsip-node'] }}
              onTransformed={(_, state) => {
                const next: CanvasState = {
                  scale: state.scale,
                  positionX: state.positionX,
                  positionY: state.positionY,
                };
                latestTransformRef.current = next;
                saveCanvasState(next);
              }}
            >
              {({ zoomIn, zoomOut }) => (
                <>
                  <TransformComponent
                    wrapperClass="rsip-canvas-wrapper w-full h-full rounded-2xl overflow-hidden"
                    contentClass="relative rsip-canvas-content"
                  >
                    <div
                      ref={containerRef}
                      className="relative"
                      style={{
                        width: contentBounds ? Math.ceil(contentBounds.width + 120) : '100%',
                        height: Math.ceil(Math.max(containerHeight, (contentBounds?.height ?? 0) + 120)),
                      }}
                    >
                      {/* SVG overlay for connectors */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <marker id="rsip-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                            <path d="M0,0 L8,4 L0,8 z" fill="#6b7280" />
                          </marker>
                        </defs>
                        {connectors.map(({ id, d, isHovered }) => (
                          <path
                            key={id}
                            ref={el => { if (el) connectorRefs.current[id] = el; }}
                            d={d}
                            fill="none"
                            stroke={isHovered ? '#f59e0b' : '#9ca3af'}
                            strokeWidth={isHovered ? 3 : 2}
                            className="transition-all duration-200"
                            markerEnd="url(#rsip-arrow)"
                          />
                        ))}
                      </svg>

                      {/* Render nodes */}
                      {Object.values(nodePositions).map(({ node, style }) => renderPolicyCard(node, style))}
                    </div>
                  </TransformComponent>

                  {reparentingId && (
                    <div className="absolute top-4 left-4 right-4 z-30 pointer-events-none">
                      <div className="pointer-events-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-white/50 dark:border-white/10 bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl px-4 py-3 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.5)]">
                        <div className="min-w-0">
                          <div className="text-sm font-chinese text-gray-900 dark:text-slate-100">
                            {tr('选择新的父节点', 'Select a new parent')}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-slate-300 font-chinese">
                            {tr('正在移动：', 'Moving: ')}
                            <span className="font-semibold">{nodesById.get(reparentingId)?.title ?? reparentingId}</span>
                            {tr('。点击目标节点作为父节点，或设为根。', '. Tap a node to set as parent, or make it a root.')}
                          </div>
                          {relationError && (
                            <div className="mt-1 text-xs text-red-600 dark:text-red-300 font-chinese">
                              {relationError}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => commitReparent(reparentingId, undefined)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/70 border border-gray-200/60 dark:border-slate-600/60 shadow-sm hover:shadow-md transition-all"
                          >
                            <CornerUpLeft size={16} />
                            <span className="text-sm font-chinese">{tr('设为根', 'Make root')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelReparent()}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/70 border border-gray-200/60 dark:border-slate-600/60 shadow-sm hover:shadow-md transition-all"
                          >
                            <X size={16} />
                            <span className="text-sm font-chinese">{tr('取消', 'Cancel')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
                    <button
                      type="button"
                      onClick={() => zoomIn()}
                      className="w-11 h-11 inline-flex items-center justify-center rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all"
                      aria-label={tr('放大', 'Zoom in')}
                      title={tr('放大', 'Zoom in')}
                    >
                      <Plus size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => zoomOut()}
                      className="w-11 h-11 inline-flex items-center justify-center rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all"
                      aria-label={tr('缩小', 'Zoom out')}
                      title={tr('缩小', 'Zoom out')}
                    >
                      <Minus size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => fitToContent()}
                      className="w-11 h-11 inline-flex items-center justify-center rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all"
                      aria-label={tr('适应内容', 'Fit to content')}
                      title={tr('适应内容', 'Fit to content')}
                    >
                      <Maximize2 size={18} />
                    </button>
                  </div>
                </>
              )}
            </TransformWrapper>
          )}
        </div>
      </div>
    </div>
  );
};


