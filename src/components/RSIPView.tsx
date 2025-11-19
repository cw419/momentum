import React, { useEffect, useMemo, useState, useRef } from 'react';
import { RSIPNode, RSIPTreeNode, RSIPMeta } from '../types';
import { buildRSIPTree, countDescendants, deleteNodeAndDescendants } from '../utils/rsipTree';
import { Plus, Trash2, ArrowLeft, Clock } from 'lucide-react';

interface RSIPViewProps {
  nodes: RSIPNode[];
  meta: RSIPMeta;
  onBack: () => void;
  onSaveNodes: (nodes: RSIPNode[]) => void;
  onSaveMeta: (meta: RSIPMeta) => void;
}

export const RSIPView: React.FC<RSIPViewProps> = ({ nodes, meta, onBack, onSaveNodes, onSaveMeta }) => {
  const tree = useMemo<RSIPTreeNode[]>(() => buildRSIPTree(nodes), [nodes]);
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [rule, setRule] = useState('');

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
    };
    // 最小改动：允许在节点对象上携带额外元数据（type/emoji），断言为 RSIPNode
    (newNode as unknown as any).type = createType;
    (newNode as unknown as any).emoji = createEmoji;
    const newNodes = [...nodes, newNode];
    onSaveNodes(newNodes);
    onSaveMeta({ ...meta, lastAddedAt: new Date() });
    setTitle('');
    setRule('');
  };

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
              new Notification('计时完成', { body: 'RSIP 定式计时已结束' });
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
    if (!confirm(`判定失败：将删除「${node.title}」及其 ${descendants} 个子节点。确认回溯？`)) return;
    const newNodes = deleteNodeAndDescendants(nodes, nodeId);
    onSaveNodes(newNodes);
  };

  const renderNode = (node: RSIPTreeNode) => (
    <div key={node.id} className="border border-gray-200 dark:border-slate-700 rounded-2xl p-4 bg-white/60 dark:bg-slate-800/60">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">{node.title}</h4>
          <p className="text-sm text-gray-600 dark:text-slate-400 font-chinese whitespace-pre-wrap">{node.rule}</p>
          {node.useTimer && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="inline-flex items-center text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-xl">
                <Clock size={14} className="mr-1" /> 计时 {node.timerMinutes} 分钟
              </div>
              {activeTimers[node.id] ? (
                <div className="inline-flex items-center space-x-2">
                  <span className="text-xs font-mono text-emerald-700 dark:text-emerald-300">{formatRemaining(activeTimers[node.id] - now)}</span>
                  <button
                    onClick={() => setActiveTimers(prev => { const c = { ...prev }; delete c[node.id]; return c; })}
                    className="px-2 py-1 text-xs rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/40 dark:text-emerald-300"
                  >
                    完成
                  </button>
                  <button
                    onClick={() => handleFailure(node.id)}
                    className="px-2 py-1 text-xs rounded-lg bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/40 dark:text-red-300"
                  >
                    判定失败
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveTimers(prev => ({ ...prev, [node.id]: Date.now() + (node.timerMinutes || 15) * 60000 }))}
                  className="px-2 py-1 text-xs rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/40 dark:text-emerald-300"
                >
                  开始计时
                </button>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => handleFailure(node.id)}
          className="p-2 text-red-500 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20"
          title="判定失败（删除此节点及其所有子节点）"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {node.children.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-dashed border-gray-200 dark:border-slate-700 space-y-3">
          {node.children.map(child => renderNode(child))}
        </div>
      )}
    </div>
  );

  // 新增：用于 Civ6 风格横向卡片渲染（不递归渲染子节点）
  const renderPolicyCard = (node: RSIPTreeNode) => (
    <div className="border border-gray-200 dark:border-slate-700 rounded-2xl p-4 bg-white/60 dark:bg-slate-800/60 min-h-[120px] flex flex-col justify-between">
      <div className="flex items-start space-x-3">
        <div className="text-3xl leading-none" aria-hidden>
          {(node as any).emoji || '📜'}
        </div>
        <div className="flex-1">
          <h4 className="text-md font-bold font-chinese text-gray-900 dark:text-slate-100">{node.title}</h4>
          <p className="text-xs text-gray-600 dark:text-slate-400 font-chinese whitespace-pre-wrap mt-1">{node.rule}</p>
        </div>
        <div className="ml-2">
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200">
            {(node as any).type || 'policy'}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center space-x-2">
          {node.useTimer && (
            <div className="inline-flex items-center text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-xl">
              <Clock size={12} className="mr-1" /> {node.timerMinutes} 分钟
            </div>
          )}
          <button
            onClick={() => handleFailure(node.id)}
            className="px-2 py-1 text-xs rounded-lg bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/40 dark:text-red-300"
          >
            判定失败
          </button>
        </div>
        <button
          onClick={() => setActiveTimers(prev => ({ ...prev, [node.id]: Date.now() + (node.timerMinutes || 15) * 60000 }))}
          className="px-2 py-1 text-xs rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/40 dark:text-emerald-300"
        >
          开始计时
        </button>
      </div>
    </div>
  );

  // 新增：SVG 连线与 hover 高亮的支持（支持 enter/exit 动画、链路高亮与拖拽）
  type Connector = { fromId: string; toId: string; path: string; key: string; status?: 'enter' | 'active' | 'exit' };
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement>>({});
  const connectorRefs = useRef<Record<string, SVGPathElement>>({});
  const prevConnectorsRef = useRef<Record<string, Connector>>({});
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredChainIds, setHoveredChainIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // 辅助：基于 nodes（扁平）快速查找父链
  const nodesById = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const getAncestors = (id?: string | null) => {
    const res: string[] = [];
    let cur = id ? nodesById.get(id) : undefined;
    while (cur && cur.parentId) {
      res.push(cur.parentId);
      cur = nodesById.get(cur.parentId);
    }
    return res;
  };
  const getDescendantsFromTree = (id: string) => {
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
  };

  // 计算连接线的路径，并支持 enter/exit 动画
  useEffect(() => {
    const compute = () => {
      const container = containerRef.current;
      if (!container) return;
      const crect = container.getBoundingClientRect();
      const newMap: Record<string, Connector> = {};

      const getAnchor = (el: HTMLDivElement, side: 'left' | 'right') => {
        const r = el.getBoundingClientRect();
        const x = side === 'left' ? (r.left - crect.left) : (r.right - crect.left);
        const y = r.top + r.height / 2 - crect.top;
        return { x, y };
      };

      const walk = (node: RSIPTreeNode) => {
        node.children.forEach(child => {
          const a = nodeRefs.current[node.id];
          const b = nodeRefs.current[child.id];
          if (a && b) {
            const p1 = getAnchor(a, 'right');
            const p2 = getAnchor(b, 'left');
            const dx = p2.x - p1.x;
            // adaptive curvature: horizontal layout -> curve based on vertical distance
            const base = Math.max(40, Math.abs(dx) * 0.25);
            const cx1 = p1.x + base;
            const cy1 = p1.y;
            const cx2 = p2.x - base;
            const cy2 = p2.y;
            const path = `M ${p1.x} ${p1.y} C ${cx1} ${cy1} ${cx2} ${cy2} ${p2.x} ${p2.y}`;
            const key = `${node.id}_${child.id}`;
            newMap[key] = { fromId: node.id, toId: child.id, path, key, status: 'active' };
          }
        });
        node.children.forEach(walk);
      };
      tree.forEach(root => walk(root));

      // diff with previous to set enter/exit
      const prev = prevConnectorsRef.current;
      const merged: Record<string, Connector> = { ...prev };
      // mark exits
      Object.keys(prev).forEach(k => { if (!newMap[k]) merged[k] = { ...prev[k], status: 'exit' }; });
      // add/activate new
      Object.keys(newMap).forEach(k => { if (!prev[k]) merged[k] = { ...newMap[k], status: 'enter' }; else merged[k] = { ...newMap[k], status: 'active' }; });

      prevConnectorsRef.current = merged;
      setConnectors(Object.values(merged));

      // schedule cleanup for exits
      const EXIT_MS = 300;
      Object.values(merged).forEach(c => {
        if (c.status === 'exit') {
          setTimeout(() => {
            const p = prevConnectorsRef.current;
            if (p[c.key] && p[c.key].status === 'exit') {
              const copy = { ...p };
              delete copy[c.key];
              prevConnectorsRef.current = copy;
              setConnectors(Object.values(copy));
            }
          }, EXIT_MS + 40);
        }
      });
    };
    const t = setTimeout(compute, 50);
    window.addEventListener('resize', compute);
    return () => { clearTimeout(t); window.removeEventListener('resize', compute); };
  }, [tree, nodes]);

  // 当 connector 元素挂载时，触发绘制动画（用于 enter）
  useEffect(() => {
    // allow DOM to update
    const id = setTimeout(() => {
      Object.entries(connectorRefs.current).forEach(([k, el]) => {
        try {
          const len = el.getTotalLength();
          el.style.strokeDasharray = `${len}`;
          if (prevConnectorsRef.current[k] && prevConnectorsRef.current[k].status === 'enter') {
            el.style.strokeDashoffset = `${len}`;
            // trigger draw
            requestAnimationFrame(() => { el.style.transition = 'stroke-dashoffset 360ms ease, opacity 240ms ease'; el.style.strokeDashoffset = '0'; el.style.opacity = '1'; });
          } else if (prevConnectorsRef.current[k] && prevConnectorsRef.current[k].status === 'exit') {
            // animate hide
            el.style.transition = 'stroke-dashoffset 260ms ease, opacity 220ms ease';
            el.style.strokeDashoffset = `${len}`;
            el.style.opacity = '0';
          } else {
            el.style.transition = 'opacity 180ms ease'; el.style.opacity = '1';
          }
        } catch (e) {
          // ignore
        }
      });
    }, 20);
    return () => clearTimeout(id);
  }, [connectors]);

  // hover chain计算：包括祖先与所有后代
  useEffect(() => {
    if (!hoveredId) { setHoveredChainIds(new Set()); return; }
    const ids = new Set<string>();
    ids.add(hoveredId);
    getAncestors(hoveredId).forEach(id => ids.add(id));
    getDescendantsFromTree(hoveredId).forEach(id => ids.add(id));
    setHoveredChainIds(ids);
  }, [hoveredId, nodes, tree]);

  // 拖拽逻辑：开始、允许、放下
  const onDragStartNode = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggingId(id);
    // small visual
    try { e.dataTransfer.effectAllowed = 'move'; } catch {}
  };
  const onDragEndNode = () => setDraggingId(null);
  const onDropOnNode = (e: React.DragEvent, targetId?: string) => {
    e.preventDefault();
    const dragId = e.dataTransfer.getData('text/plain') || draggingId;
    setDraggingId(null);
    if (!dragId) return;
    if (dragId === targetId) return;
    // prevent drop onto own descendant
    const desc = getDescendantsFromTree(dragId);
    if (targetId && desc.includes(targetId)) return; // ignore to prevent cycle
    // update nodes parentId
    const updated = nodes.map(n => n.id === dragId ? { ...n, parentId: targetId || undefined } : n);
    onSaveNodes(updated);
  };

  const flatForSelect = (arr: RSIPTreeNode[]): RSIPTreeNode[] => {
    const res: RSIPTreeNode[] = [];
    const walk = (n: RSIPTreeNode) => { res.push(n); n.children.forEach(walk); };
    arr.forEach(walk);
    return res;
  };

  // Create form state for timer and daily policy
  const [createUseTimer, setCreateUseTimer] = useState<boolean>(false);
  const [createTimerMinutes, setCreateTimerMinutes] = useState<number>(15);
  // 预设类型 -> emoji 映射（扩展更多类型）
  const typeEmojiMap: Record<string, string> = { policy: '📜', habit: '🔁', reward: '🏆', penalty: '⚠️', ritual: '✨', goal: '🎯', trigger: '⚡️', reminder: '🔔' } as Record<string,string>;
  const [createType, setCreateType] = useState<string>('policy');
  const [createEmoji, setCreateEmoji] = useState<string>(typeEmojiMap['policy']);
  // 支持用户在会话中添加自定义预设（不会持久化到后端，若需持久可上层存储）
  const [customTypes, setCustomTypes] = useState<Array<{ type: string; emoji: string }>>([]);
  const [customNameInput, setCustomNameInput] = useState<string>('');
  const [customEmojiInput, setCustomEmojiInput] = useState<string>('✨');
  // 持久化：从 meta 初始化自定义预设，并在新增时写回 meta.typePresets
  useEffect(() => {
    try {
      const presets = (meta as any).typePresets as Array<{ type: string; emoji: string }> | undefined;
      if (presets && Array.isArray(presets)) setCustomTypes(presets);
    } catch { /* ignore */ }
  }, [meta]);

  // 颜色映射：类型 -> 徽章/环样式（Tailwind classes）
  const typeColorMap: Record<string, { badge: string; ring: string }> = {
    policy: { badge: 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200', ring: 'ring-emerald-300 dark:ring-emerald-600' },
    habit: { badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200', ring: 'ring-blue-300 dark:ring-blue-600' },
    reward: { badge: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200', ring: 'ring-yellow-300 dark:ring-yellow-600' },
    penalty: { badge: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-200', ring: 'ring-red-300 dark:ring-red-600' },
    ritual: { badge: 'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-200', ring: 'ring-pink-300 dark:ring-pink-600' },
    goal: { badge: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200', ring: 'ring-emerald-300 dark:ring-emerald-600' },
    trigger: { badge: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200', ring: 'ring-indigo-300 dark:ring-indigo-600' },
    reminder: { badge: 'bg-violet-100 dark:bg-violet-900/20 text-violet-800 dark:text-violet-200', ring: 'ring-violet-300 dark:ring-violet-600' },
  };

  // 过滤与图例支持
  const [filterType, setFilterType] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <button onClick={onBack} className="p-3 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 rounded-2xl hover:bg-white/60 dark:hover:bg-slate-800/60">
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-chinese text-gray-900 dark:text-slate-100">国策树 · RSIP</h1>
              <p className="text-xs font-mono text-gray-600 dark:text-slate-400 tracking-wider uppercase">Recursive Stabilization Iteration Protocol</p>
            </div>
          </div>
          {/* Daily policy toggle */}
          <div className="flex items-center space-x-3">
            <span className="text-xs font-chinese text-gray-600 dark:text-slate-400">一天可多条</span>
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
            <h2 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-3">开始你的第一条国策</h2>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed font-chinese">
              RSIP 强调通过「每天至多新增一个、失败即回溯」来稳定迭代你的生活定式。选择一个小而稳的起点，建立第一条国策吧。
            </p>
          </div>
        )}

        {/* Add form */}
        <div className="bento-card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">父节点（可空，表示新分支）</label>
              <select
                value={selectedParentId || ''}
                onChange={e => setSelectedParentId(e.target.value || undefined)}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
              >
                <option value="">（无父节点，建立新根）</option>
                {flatForSelect(tree).map(n => (
                  <option key={n.id} value={n.id}>{'— '.repeat(n.depth)}{n.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">国策标题</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例如：进门15分钟内开始洗澡"
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">精准规则</label>
              <input
                value={rule}
                onChange={e => setRule(e.target.value)}
                placeholder="例如：回家即启动15分钟计时，计时内进浴室"
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
              />
            </div>
          </div>
          {/* Timer settings */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between bento-subtle px-4 py-3 rounded-2xl">
              <div className="flex items-center space-x-2">
                <Clock size={16} className="text-emerald-600" />
                <span className="text-sm font-chinese text-gray-700 dark:text-slate-300">启用计时</span>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">计时分钟数</label>
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
          {/* 新增：类型与 Emoji 选择（最小化 UI） */}
          <div className="mt-4 flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">节点类型</label>
              <select
                value={createType}
                onChange={e => {
                  const t = e.target.value;
                  if (t === 'custom') {
                    // 切换到自定义编辑模式（保留现有 emoji）
                    setCreateType('custom');
                    setCreateEmoji(customEmojiInput || '✨');
                  } else {
                    // 可能是预设或先前保存的自定义预设
                    const fromCustom = customTypes.find(c => c.type === t);
                    if (fromCustom) {
                      setCreateType(fromCustom.type);
                      setCreateEmoji(fromCustom.emoji);
                    } else {
                      setCreateType(t);
                      setCreateEmoji(typeEmojiMap[t] || '📜');
                    }
                  }
                }}
                 className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-3 py-2 text-gray-900 dark:text-slate-100 focus:outline-none transition-all duration-200 font-chinese"
               >
                 <option value="policy">Policy（国策）</option>
                 <option value="habit">Habit（习惯）</option>
                 <option value="reward">Reward（奖励）</option>
                 <option value="penalty">Penalty（惩罚）</option>
                 <option value="ritual">Ritual（仪式）</option>
                 <option value="goal">Goal（目标）</option>
                 <option value="trigger">Trigger（触发）</option>
                 <option value="reminder">Reminder（提醒）</option>
                 {customTypes.map(c => <option key={c.type} value={c.type}>{c.type}</option>)}
                 <option value="custom">自定义…</option>
               </select>
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">Emoji</label>
               <div className="flex items-center space-x-2">
                 <input
                   value={createEmoji}
                   onChange={e => setCreateEmoji(e.target.value)}
                   placeholder="例如：✅ 或 🎯"
                   className="w-24 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-3 py-2 text-gray-900 dark:text-slate-100 focus:outline-none transition-all duration-200"
                 />
                {/* 预设 emoji 按钮已移除（使用类型自动映射或手动输入） */}
               </div>
             </div>
           </div>
           {/* 自定义类型输入区域（仅在选择自定义时显示） */}
           {createType === 'custom' && (
             <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">自定义类型名称</label>
                 <input value={customNameInput} onChange={e => setCustomNameInput(e.target.value)} placeholder="例如：streak" className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-3 py-2 text-gray-900 dark:text-slate-100" />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">自定义 Emoji</label>
                 <input value={customEmojiInput} onChange={e => setCustomEmojiInput(e.target.value)} placeholder="例如：🔥" className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-3 py-2 text-gray-900 dark:text-slate-100" />
               </div>
               <div className="flex items-end">
                 <button type="button" onClick={() => {
                   const name = customNameInput.trim();
                   const emoji = customEmojiInput.trim() || '✨';
                   if (!name) return;
                   // 保存为会话预设并持久化到 meta
                   let updated = customTypes;
                   if (!updated.find(c => c.type === name)) updated = [...updated, { type: name, emoji }];
                   setCustomTypes(updated);
                   try {
                     const newMeta = { ...(meta || {}) } as any;
                     newMeta.typePresets = updated;
                     onSaveMeta(newMeta as RSIPMeta);
                   } catch { /* ignore */ }
                   setCreateType(name);
                   setCreateEmoji(emoji);
                   setCustomNameInput('');
                 }} className="px-3 py-2 rounded-2xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/40">保存并使用</button>
               </div>
             </div>
           )}
          {/* 过滤与图例栏 */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <label className="text-sm font-chinese text-gray-700 dark:text-slate-300">按类型筛选：</label>
              <select value={filterType || ''} onChange={e => setFilterType(e.target.value || null)} className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-3 py-2 text-gray-900 dark:text-slate-100">
                <option value="">全部</option>
                {Object.keys(typeEmojiMap).map(t => <option key={t} value={t}>{t}</option>)}
                {customTypes.map(c => <option key={c.type} value={c.type}>{c.type}</option>)}
              </select>
              <button type="button" onClick={() => setFilterType(null)} className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-700">清除</button>
            </div>
            <div className="flex items-center space-x-2">
              {/* legend: 仅显示类型名与颜色徽章（移除 emoji 预览） */}
              {[...Object.keys(typeEmojiMap), ...customTypes.map(c => c.type)].map(t => {
                const col = typeColorMap[t] || { badge: 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200' };
                return (
                  <div key={t} className={`px-2 py-1 rounded-lg ${col.badge} text-xs font-chinese`}>{t}</div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm font-chinese text-gray-600 dark:text-slate-400">
              每天最多新增一个国策。{canAddToday ? '今日可新增。' : '今日已新增，明日继续。'}
            </div>
            <button
              onClick={handleAdd}
              disabled={!canAddToday || !title.trim() || !rule.trim()}
              className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-medium transition-all duration-300 shadow-lg ${(!canAddToday || !title.trim() || !rule.trim()) ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500' : 'gradient-primary text-white hover:shadow-xl hover:scale-105'}`}
            >
              <Plus size={18} />
              <span className="font-chinese">新增国策</span>
            </button>
          </div>
        </div>

        {/* Tree */}
        <div>
          {tree.length === 0 ? (
            <div className="text-center text-gray-600 dark:text-slate-400 font-chinese">尚无国策，先从上方表单添加一个吧。</div>
          ) : (
            (() => {
               // 使用 tree 的根作为家族列（每个根节点及其后代为一列）
               return (
                 <div className="space-y-6">
                   <div ref={containerRef} className="relative">
                    {/* SVG overlay for connectors */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <marker id="rsip-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                          <path d="M0,0 L8,4 L0,8 z" fill="#6b7280" />
                        </marker>
                        <marker id="rsip-arrow-active" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                          <path d="M0,0 L10,5 L0,10 z" fill="#10B981" />
                        </marker>
                      </defs>
                      {connectors.map((c) => {
                        const isActive = hoveredChainIds.has(c.fromId) || hoveredChainIds.has(c.toId);
                        return (
                          <path
                            key={c.key}
                            ref={el => { if (el) connectorRefs.current[c.key] = el; else delete connectorRefs.current[c.key]; }}
                            d={c.path}
                            stroke={isActive ? '#10B981' : 'rgba(107,114,128,0.6)'}
                            strokeWidth={isActive ? 2.6 : 1.6}
                            fill="none"
                            strokeDasharray={c.status === 'enter' || c.status === 'active' ? '0' : '6 6'}
                            markerEnd={isActive ? 'url(#rsip-arrow-active)' : 'url(#rsip-arrow)'}
                            style={{ transition: 'stroke 180ms ease, stroke-width 180ms ease, opacity 220ms ease' }}
                            opacity={c.status === 'exit' ? 0 : 1}
                          />
                        );
                      })}
                    </svg>

                    {/* 按家族行渲染：每个根节点及其后代为一行，家族内节点水平排列（更接近 Civ6） */}
                    <div className="flex flex-col items-start space-y-6 overflow-auto py-6 px-4">
                      {tree.map(root => {
                        // 基于层级（BFS）按列渲染此家族，保证父节点在子节点左侧
                        const levels: Record<number, RSIPTreeNode[]> = {};
                        const queue: Array<{ node: RSIPTreeNode; depth: number }> = [{ node: root, depth: 0 }];
                        while (queue.length) {
                          const { node, depth } = queue.shift()!;
                          if (!levels[depth]) levels[depth] = [];
                          levels[depth].push(node);
                          node.children.forEach(child => queue.push({ node: child, depth: depth + 1 }));
                        }
                        const depthKeys = Object.keys(levels).map(Number).sort((a, b) => a - b);
                        return (
                          <div key={root.id} className="flex flex-row items-start space-x-6 w-full">
                            {depthKeys.map(depth => (
                              <div key={depth} className="flex flex-col items-center space-y-4 min-w-[220px]">
                                {levels[depth].map(n => {
                                  const ntype = (n as any).type || 'policy';
                                  if (filterType && filterType !== ntype) return null;
                                  const color = typeColorMap[ntype] || { ring: 'ring-emerald-300 dark:ring-emerald-600' };
                                  return (
                                    <div
                                      key={n.id}
                                      draggable
                                      onDragStart={(e) => onDragStartNode(e, n.id)}
                                      onDragEnd={onDragEndNode}
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => onDropOnNode(e, n.id)}
                                      ref={el => { if (el) nodeRefs.current[n.id] = el; else delete nodeRefs.current[n.id]; }}
                                      data-id={n.id}
                                      onMouseEnter={() => setHoveredId(n.id)}
                                      onMouseLeave={() => setHoveredId(null)}
                                      className={`bento-card w-full ${hoveredChainIds.has(n.id) ? `ring-2 ${color.ring}` : ''}`}
                                    >
                                      {renderPolicyCard(n)}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                   </div>
                 </div>
               );
             })()
           )}
         </div>
        {/* 容器级别支持：拖放到空白处设为根 */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const dragId = e.dataTransfer.getData('text/plain') || draggingId; if (dragId) { onDropOnNode(e, undefined); } }}
        />
      </div>
    </div>
  );
};


