import React, { useMemo, useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { RSIPMeta, RSIPNode, RSIPTreeNode, RSIPMode } from '../types';
import { useI18n } from '../i18n';
import { buildRSIPTree, getDescendantIds, getDescendantCount } from '../utils/rsipTree';
import { RSIPCanvas } from './rsip/RSIPCanvas';
import { RSIPForm } from './rsip/RSIPForm';
import { RSIPModeSwitch } from './rsip/RSIPModeSwitch';
import { RSIPDailyReminder } from './rsip/RSIPDailyReminder';
import { RSIPStrictModeCard } from './rsip/RSIPStrictModeCard';
import { RSIPViolationDialog } from './rsip/RSIPViolationDialog';

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

  // 严格模式状态
  const [violationDialogNode, setViolationDialogNode] = useState<RSIPNode | null>(null);

  // 计算当前模式
  const currentMode: RSIPMode = meta.allowMultiplePerDay ? 'free' : 'strict';
  const isStrictMode = currentMode === 'strict';

  // 检查今日是否已打开国策树
  const hasOpenedToday = useMemo(() => {
    if (!meta.lastTreeOpenedAt) return false;
    return new Date(meta.lastTreeOpenedAt).toDateString() === new Date().toDateString();
  }, [meta.lastTreeOpenedAt]);

  const canAddToday = (() => {
    if (meta.allowMultiplePerDay) return true;
    if (!meta.lastAddedAt) return true;
    const last = new Date(meta.lastAddedAt);
    const now = new Date();
    return last.toDateString() !== now.toDateString();
  })();

  // 模式切换处理
  const handleModeChange = useCallback((mode: RSIPMode) => {
    onSaveMeta({ ...meta, allowMultiplePerDay: mode === 'free' });
  }, [meta, onSaveMeta]);

  // 记录打开国策树
  const handleRecordTreeOpened = useCallback(() => {
    const now = new Date();
    const today = now.toDateString();
    const lastOpened = meta.lastTreeOpenedAt ? new Date(meta.lastTreeOpenedAt).toDateString() : null;

    let treeOpenStreak = meta.treeOpenStreak ?? 0;
    if (lastOpened !== today) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      treeOpenStreak = lastOpened === yesterday.toDateString() ? treeOpenStreak + 1 : 1;
    }

    onSaveMeta({ ...meta, lastTreeOpenedAt: now, treeOpenStreak });
  }, [meta, onSaveMeta]);

  // 标记定式已执行
  const handleMarkExecuted = useCallback((nodeId: string) => {
    const now = new Date();
    const updatedNodes = nodes.map(node => {
      if (node.id !== nodeId) return node;

      const consecutiveExecutions = (node.consecutiveExecutions ?? 0) + 1;
      const totalExecutions = (node.totalExecutions ?? 0) + 1;

      let stabilityPhase = node.stabilityPhase ?? 'E0';
      let phaseStartedAt = node.phaseStartedAt;

      if (stabilityPhase === 'E0' && consecutiveExecutions >= 7) {
        stabilityPhase = 'E1';
        phaseStartedAt = now;
      } else if (stabilityPhase === 'E1' && consecutiveExecutions >= 21) {
        stabilityPhase = 'E2';
        phaseStartedAt = now;
      }

      return {
        ...node,
        lastExecutedAt: now,
        consecutiveExecutions,
        consecutiveViolations: 0,
        totalExecutions,
        stabilityPhase,
        phaseStartedAt,
      };
    });

    onSaveNodes(updatedNodes);
  }, [nodes, onSaveNodes]);

  // 标记定式已违反（触发堆栈删除）
  const handleMarkViolated = useCallback((nodeId: string) => {
    const idsToDelete = new Set([nodeId, ...getDescendantIds(nodes, nodeId)]);
    const updatedNodes = nodes.filter(node => !idsToDelete.has(node.id));
    onSaveNodes(updatedNodes);
    setViolationDialogNode(null);
  }, [nodes, onSaveNodes]);

  // 计算约束力
  const calculateConstraintPower = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { descendantCount: 0, failureCost: 0 };

    const descendantCount = getDescendantCount(nodes, nodeId);
    const phaseWeight = { E0: 1, E1: 2, E2: 3 };
    const weight = phaseWeight[node.stabilityPhase ?? 'E0'];
    const failureCost = (descendantCount + 1) * weight;

    return { descendantCount, failureCost };
  }, [nodes]);

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

        </header>

        {/* 模式切换 */}
        <div className="mb-6">
          <RSIPModeSwitch mode={currentMode} onModeChange={handleModeChange} />
        </div>

        {/* 严格模式：每日打开提醒 */}
        {isStrictMode && (
          <RSIPDailyReminder
            hasOpenedToday={hasOpenedToday}
            treeOpenStreak={meta.treeOpenStreak ?? 0}
            onRecordOpened={handleRecordTreeOpened}
          />
        )}

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

        {/* 严格模式：定式列表视图 */}
        {isStrictMode && nodes.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-white mb-4">
              {tr('定式执行追踪', 'Policy Execution Tracking')}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {nodes.map(node => {
                const { descendantCount, failureCost } = calculateConstraintPower(node.id);
                return (
                  <RSIPStrictModeCard
                    key={node.id}
                    node={node}
                    descendantCount={descendantCount}
                    failureCost={failureCost}
                    onMarkExecuted={() => handleMarkExecuted(node.id)}
                    onMarkViolated={() => setViolationDialogNode(node)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 违反确认对话框 */}
        {violationDialogNode && (
          <RSIPViolationDialog
            isOpen={true}
            node={violationDialogNode}
            descendants={nodes.filter(n =>
              getDescendantIds(nodes, violationDialogNode.id).includes(n.id)
            )}
            onConfirm={() => handleMarkViolated(violationDialogNode.id)}
            onCancel={() => setViolationDialogNode(null)}
          />
        )}
      </div>
    </div>
  );
};

