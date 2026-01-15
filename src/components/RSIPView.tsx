import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { RSIPMeta, RSIPNode, RSIPTreeNode } from '../types';
import { useI18n } from '../i18n';
import { buildRSIPTree } from '../utils/rsipTree';
import { RSIPCanvas } from './rsip/RSIPCanvas';
import { RSIPForm } from './rsip/RSIPForm';

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
  const [createUseTimer, setCreateUseTimer] = useState<boolean>(false);
  const [createTimerMinutes, setCreateTimerMinutes] = useState<number>(15);
  const [createType, setCreateType] = useState<string>('policy');
  const [createEmoji, setCreateEmoji] = useState<string>('📝');

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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto relative">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-3 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 rounded-2xl hover:bg-white/60 dark:hover:bg-slate-800/60"
            >
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

        <RSIPForm
          tree={tree}
          meta={meta}
          canAddToday={canAddToday}
          selectedParentId={selectedParentId}
          setSelectedParentId={setSelectedParentId}
          title={title}
          setTitle={setTitle}
          rule={rule}
          setRule={setRule}
          createUseTimer={createUseTimer}
          setCreateUseTimer={setCreateUseTimer}
          createTimerMinutes={createTimerMinutes}
          setCreateTimerMinutes={setCreateTimerMinutes}
          createType={createType}
          setCreateType={setCreateType}
          setCreateEmoji={setCreateEmoji}
          onAdd={handleAdd}
          language={language}
          tr={tr}
        />

        <RSIPCanvas nodes={nodes} tree={tree} onSaveNodes={onSaveNodes} language={language} tr={tr} />
      </div>
    </div>
  );
};

