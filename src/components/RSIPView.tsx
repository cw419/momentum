import React, { useCallback, useMemo, useState } from 'react';
import type {
  RSIPNode,
  RSIPTreeNode,
  RSIPMode,
} from '../types';
import type { RSIPViewProps } from './RSIPView.types';
import { useI18n } from '../i18n';
import {
  buildRSIPTree,
  getDescendantCount,
  getDescendantIds,
} from '../utils/rsipTree';
import { logger } from '../utils/logger';
import { RSIPCanvas } from './rsip/RSIPCanvas';
import { RSIPForm } from './rsip/RSIPForm';
import { RSIPModeSwitch } from './rsip/RSIPModeSwitch';
import { RSIPDailyReminder } from './rsip/RSIPDailyReminder';
import { RSIPStrictModeCard } from './rsip/RSIPStrictModeCard';
import { RSIPViolationDialog } from './rsip/RSIPViolationDialog';
import { RSIPPolicyLibrary } from './rsip/RSIPPolicyLibrary';
import { RSIPRunHistory } from './rsip/RSIPRunHistory';
import { RSIPInsightsPanel } from './rsip/RSIPInsightsPanel';
import { RSIPTaskLinkPanel } from './rsip/RSIPTaskLinkPanel';
import { BackButton } from './BackButton';

type RSIPTab = 'tree' | 'library' | 'history' | 'insights';

interface SplitDraftItem {
  id: string;
  title: string;
  rule: string;
  isPassive: boolean;
}

function getSplitTemplates(
  language: string,
): Record<string, { goal: string; items: SplitDraftItem[] }> {
  const isZh = language.startsWith('zh');
  return {
    sleep: {
      goal: isZh ? '早睡早起' : 'Sleep early and wake early',
      items: [
        {
          id: 'sleep-1',
          title: isZh ? '23:00 前入睡' : 'Sleep before 23:00',
          rule: isZh
            ? '22:45 开始睡前流程，23:00 前上床。'
            : 'Start wind-down at 22:45 and be in bed before 23:00.',
          isPassive: false,
        },
        {
          id: 'sleep-2',
          title: isZh ? '睡前断屏' : 'No-screen before sleep',
          rule: isZh
            ? '22:30 后手机仅保留闹钟功能。'
            : 'After 22:30, keep phone only for alarm use.',
          isPassive: true,
        },
      ],
    },
    exercise: {
      goal: isZh ? '稳定运动' : 'Stable exercise habit',
      items: [
        {
          id: 'exercise-1',
          title: isZh ? '回家立刻换运动服' : 'Change into workout clothes',
          rule: isZh
            ? '下班到家 10 分钟内换好运动服。'
            : 'Change into workout clothes within 10 minutes after getting home.',
          isPassive: false,
        },
        {
          id: 'exercise-2',
          title: isZh ? '最低运动量' : 'Minimum exercise dose',
          rule: isZh
            ? '每天至少完成 10 分钟步行或拉伸。'
            : 'Complete at least 10 minutes of walking or stretching daily.',
          isPassive: false,
        },
      ],
    },
    diet: {
      goal: isZh ? '饮食控制' : 'Diet control',
      items: [
        {
          id: 'diet-1',
          title: isZh ? '提前备餐' : 'Prep meals in advance',
          rule: isZh
            ? '工作日晚间准备次日午餐。'
            : 'Prepare next-day lunch during weekday evenings.',
          isPassive: true,
        },
        {
          id: 'diet-2',
          title: isZh ? '晚间零食拦截' : 'Night snack cutoff',
          rule: isZh
            ? '21:00 后不摄入高糖零食。'
            : 'No high-sugar snacks after 21:00.',
          isPassive: false,
        },
      ],
    },
  };
}

function getFallbackUpdatedNodesForExecuted(
  nodes: RSIPNode[],
  nodeId: string,
): RSIPNode[] {
  const now = new Date();
  return nodes.map((node) => {
    if (node.id !== nodeId) return node;

    const consecutiveExecutions = (node.consecutiveExecutions ?? 0) + 1;
    const totalExecutions = (node.totalExecutions ?? 0) + 1;
    const cumulativeExecutionDays = (node.cumulativeExecutionDays ?? 0) + 1;

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
      stabilityPhase,
      phaseStartedAt,
      cumulativeExecutionDays,
      consecutiveExecutions,
      consecutiveViolations: 0,
      totalExecutions,
      lastExecutedAt: now,
    };
  });
}

function getFallbackUpdatedNodesForViolation(
  nodes: RSIPNode[],
  nodeId: string,
): RSIPNode[] {
  const idsToDelete = new Set([nodeId, ...getDescendantIds(nodes, nodeId)]);
  return nodes.filter((node) => !idsToDelete.has(node.id));
}

export const RSIPView: React.FC<RSIPViewProps> = ({
  nodes,
  meta,
  groups = [],
  policyLibrary = [],
  runHistory = [],
  executionRecords = [],
  taskLinks = [],
  chains = [],
  onBack,
  onSaveNodes,
  onSaveMeta,
  onSaveGroups,
  onSaveTaskLinks,
  onMarkExecuted,
  onMarkViolated,
  onReinforceNode,
  onRestoreFromLibrary,
  onCreateGroup,
  onUpsertTaskLinks,
  onGetTaskActions,
  onStartChain,
  onScheduleChain,
}) => {
  const { language, tr } = useI18n();
  const tree = useMemo<RSIPTreeNode[]>(() => buildRSIPTree(nodes), [nodes]);

  const [activeTab, setActiveTab] = useState<RSIPTab>('tree');
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(
    undefined,
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(
    undefined,
  );
  const [title, setTitle] = useState('');
  const [rule, setRule] = useState('');
  const [createUseTimer, setCreateUseTimer] = useState<boolean>(false);
  const [createTimerMinutes, setCreateTimerMinutes] = useState<number>(15);
  const [createType, setCreateType] = useState<string>('policy');
  const [createEmoji, setCreateEmoji] = useState<string>('📜');
  const [createIsPassive, setCreateIsPassive] = useState(false);

  const [splitMode, setSplitMode] = useState(false);
  const [splitGoal, setSplitGoal] = useState('');
  const [splitItems, setSplitItems] = useState<SplitDraftItem[]>([]);

  const [violationDialogNode, setViolationDialogNode] = useState<RSIPNode | null>(
    null,
  );
  const [violationGroupMessage, setViolationGroupMessage] = useState<string>();
  const splitTemplates = useMemo(() => getSplitTemplates(language), [language]);

  const currentMode: RSIPMode = meta.allowMultiplePerDay ? 'free' : 'strict';
  const isStrictMode = currentMode === 'strict';
  const hasOpenedToday = useMemo(() => {
    if (!meta.lastTreeOpenedAt) return false;
    return (
      new Date(meta.lastTreeOpenedAt).toDateString() ===
      new Date().toDateString()
    );
  }, [meta.lastTreeOpenedAt]);

  const canAddToday = (() => {
    if (meta.allowMultiplePerDay) return true;
    if (!meta.lastAddedAt) return true;
    const last = new Date(meta.lastAddedAt);
    const now = new Date();
    return last.toDateString() !== now.toDateString();
  })();

  const handleModeChange = useCallback(
    (mode: RSIPMode) => {
      onSaveMeta({ ...meta, allowMultiplePerDay: mode === 'free' });
    },
    [meta, onSaveMeta],
  );

  const handleRecordTreeOpened = useCallback(() => {
    const now = new Date();
    const today = now.toDateString();
    const lastOpened = meta.lastTreeOpenedAt
      ? new Date(meta.lastTreeOpenedAt).toDateString()
      : null;

    let treeOpenStreak = meta.treeOpenStreak ?? 0;
    if (lastOpened !== today) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      treeOpenStreak =
        lastOpened === yesterday.toDateString() ? treeOpenStreak + 1 : 1;
    }

    onSaveMeta({ ...meta, lastTreeOpenedAt: now, treeOpenStreak });
  }, [meta, onSaveMeta]);

  const handleCreateGroup = useCallback(async () => {
    if (!onCreateGroup || !onSaveGroups) return;

    const titleInput = window.prompt(
      tr('请输入国策组名称', 'Enter policy group name'),
    );
    if (!titleInput?.trim()) return;
    const toleranceInput = window.prompt(
      tr('请输入容错值（整数）', 'Enter fault tolerance (integer)'),
      '1',
    );
    const faultTolerance = Number(toleranceInput ?? '1');
    const emoji =
      window.prompt(
        tr('可选：输入国策组 Emoji', 'Optional: input group emoji'),
        '🧱',
      ) ?? undefined;

    const group = await onCreateGroup(titleInput.trim(), faultTolerance, emoji);
    onSaveGroups([...groups, group]);
    setSelectedGroupId(group.id);
  }, [groups, onCreateGroup, onSaveGroups, tr]);

  const handleAddSingle = useCallback(() => {
    if (!canAddToday) return;
    if (!title.trim() || !rule.trim()) return;
    const newNode: RSIPNode = {
      id: crypto.randomUUID(),
      parentId: selectedParentId || undefined,
      groupId: selectedGroupId || undefined,
      title: title.trim(),
      rule: rule.trim(),
      sortOrder: Math.floor(Date.now() / 1000),
      createdAt: new Date(),
      useTimer: createUseTimer,
      timerMinutes: createUseTimer ? createTimerMinutes : undefined,
      type: createType,
      emoji: createEmoji,
      isPassive: createIsPassive,
    };
    const newNodes = [...nodes, newNode];
    onSaveNodes(newNodes);
    onSaveMeta({ ...meta, lastAddedAt: new Date() });
    setTitle('');
    setRule('');
  }, [
    canAddToday,
    createEmoji,
    createIsPassive,
    createTimerMinutes,
    createType,
    createUseTimer,
    meta,
    nodes,
    onSaveMeta,
    onSaveNodes,
    rule,
    selectedGroupId,
    selectedParentId,
    title,
  ]);

  const handleApplySplitTemplate = useCallback((templateKey: string) => {
    const template = splitTemplates[templateKey];
    if (!template) return;
    setSplitGoal(template.goal);
    setSplitItems(
      template.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      })),
    );
  }, [splitTemplates]);

  const handleAddSplitRow = useCallback(() => {
    setSplitItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: '', rule: '', isPassive: false },
    ]);
  }, []);

  const handleSubmitSplit = useCallback(() => {
    if (!canAddToday) return;
    const validItems = splitItems.filter(
      (item) => item.title.trim().length > 0 && item.rule.trim().length > 0,
    );
    if (validItems.length === 0) return;

    const groupId = selectedGroupId;
    const baseSort = Math.floor(Date.now() / 1000);
    const createdAt = new Date();
    const newNodes = validItems.map((item, index) => ({
      id: crypto.randomUUID(),
      parentId: selectedParentId || undefined,
      groupId: groupId || undefined,
      title: item.title.trim(),
      rule: item.rule.trim(),
      sortOrder: baseSort + index,
      createdAt,
      type: createType,
      emoji: createEmoji,
      isPassive: item.isPassive,
      splitFromGoal: splitGoal.trim() || undefined,
    }));

    onSaveNodes([...nodes, ...newNodes]);
    onSaveMeta({ ...meta, lastAddedAt: new Date() });
    setSplitItems([]);
    setSplitGoal('');
  }, [
    canAddToday,
    createEmoji,
    createType,
    meta,
    nodes,
    onSaveMeta,
    onSaveNodes,
    selectedGroupId,
    selectedParentId,
    splitGoal,
    splitItems,
  ]);

  const handleMarkExecuted = useCallback(
    async (nodeId: string, reinforce = false) => {
      let updatedNodes: RSIPNode[];
      if (onMarkExecuted) {
        updatedNodes = await onMarkExecuted(nodeId, nodes, undefined, {
          reinforce,
        });
      } else {
        updatedNodes = getFallbackUpdatedNodesForExecuted(nodes, nodeId);
        onSaveNodes(updatedNodes);
      }

      const linkedActions =
        onGetTaskActions?.(nodeId) ??
        taskLinks.filter(
          (link) =>
            link.rsipNodeId === nodeId &&
            link.triggerEvent === 'rsip_mark_executed' &&
            link.isActive,
        );

      for (const link of linkedActions) {
        const targetChain = chains.find((chain) => chain.id === link.chainId);
        if (!targetChain) {
          logger.warn('RSIP', 'RSIP->task link skipped: missing target chain', {
            linkId: link.id,
            chainId: link.chainId,
          });
          continue;
        }

        const requiresConfirm = link.automation !== 'auto';
        if (requiresConfirm) {
          const confirmed = window.confirm(
            language.startsWith('zh')
              ? `国策已执行，是否联动任务「${targetChain.name}」？`
              : `Policy executed. Trigger linked task "${targetChain.name}"?`,
          );
          if (!confirmed) continue;
        }

        if (link.effect === 'prompt_start_chain' && onStartChain) {
          await onStartChain(link.chainId);
        } else if (link.effect === 'prompt_schedule_chain' && onScheduleChain) {
          onScheduleChain(link.chainId);
        }
      }

      return updatedNodes;
    },
    [
      chains,
      language,
      nodes,
      onGetTaskActions,
      onMarkExecuted,
      onSaveNodes,
      onScheduleChain,
      onStartChain,
      taskLinks,
    ],
  );

  const openViolationDialog = useCallback(
    (node: RSIPNode) => {
      setViolationDialogNode(node);
      if (!node.groupId) {
        setViolationGroupMessage(undefined);
        return;
      }

      const group = groups.find((item) => item.id === node.groupId);
      if (!group) {
        setViolationGroupMessage(undefined);
        return;
      }

      const groupNodes = nodes.filter((item) => item.groupId === group.id);
      const survivorsAfterLoss = groupNodes.length - 1;
      const minAlive = Math.max(0, groupNodes.length - group.faultTolerance);

      if (survivorsAfterLoss >= minAlive) {
        setViolationGroupMessage(
          language.startsWith('zh')
            ? `国策组「${group.title}」仍有容错余量，本次违反不会导致整组崩溃。`
            : `Group "${group.title}" still has tolerance remaining. This violation will not collapse the whole group.`,
        );
      } else {
        setViolationGroupMessage(
          language.startsWith('zh')
            ? `国策组「${group.title}」容错已耗尽，本次违反会触发整组崩溃。`
            : `Group "${group.title}" has exhausted tolerance. This violation will collapse the group.`,
        );
      }
    },
    [groups, language, nodes],
  );

  const handleConfirmViolation = useCallback(
    async (payload: { reasonCode?: string; repairHint?: string }) => {
      if (!violationDialogNode) return;

      if (onMarkViolated) {
        await onMarkViolated(violationDialogNode.id, nodes, undefined, {
          reasonCode: payload.reasonCode,
          repairHint: payload.repairHint,
          collapseReason: payload.reasonCode,
        });
      } else {
        const updatedNodes = getFallbackUpdatedNodesForViolation(
          nodes,
          violationDialogNode.id,
        );
        onSaveNodes(updatedNodes);
      }

      setViolationDialogNode(null);
      setViolationGroupMessage(undefined);
    },
    [nodes, onMarkViolated, onSaveNodes, violationDialogNode],
  );

  const handleRestoreFromLibrary = useCallback(
    async (entryId: string, parentId?: string) => {
      if (onRestoreFromLibrary) {
        await onRestoreFromLibrary(entryId, parentId);
        return;
      }

      const entry = policyLibrary.find((item) => item.id === entryId);
      if (!entry) return;
      const node: RSIPNode = {
        id: crypto.randomUUID(),
        parentId,
        title: entry.title,
        rule: entry.rule,
        sortOrder: Math.floor(Date.now() / 1000),
        createdAt: new Date(),
        useTimer: entry.useTimer,
        timerMinutes: entry.timerMinutes,
        emoji: entry.emoji,
        type: entry.type,
        isPassive: entry.isPassive,
        cumulativeExecutionDays: entry.cumulativeExecutionDays,
      };
      onSaveNodes([...nodes, node]);
    },
    [nodes, onRestoreFromLibrary, onSaveNodes, policyLibrary],
  );

  const calculateConstraintPower = useCallback(
    (nodeId: string) => {
      const node = nodes.find((item) => item.id === nodeId);
      if (!node) return { descendantCount: 0, failureCost: 0 };
      const descendantCount = getDescendantCount(nodes, nodeId);
      const phaseWeight = { E0: 1, E1: 2, E2: 3 };
      const weight =
        phaseWeight[(node.stabilityPhase ?? 'E0') as keyof typeof phaseWeight];
      const reinforcementMultiplier = (node.reinforcementLevel ?? 0) > 0 ? 0.3 : 1;
      const failureCost =
        Math.round((descendantCount + 1) * weight * reinforcementMultiplier * 100) /
        100;
      return { descendantCount, failureCost };
    },
    [nodes],
  );

  return (
    <div className="bg-background min-h-screen p-4 md:p-6">
      <div className="relative mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BackButton
              onClick={onBack}
              label={tr('返回', 'Back')}
              iconSize={22}
              className="rounded-2xl p-3 text-gray-400 hover:bg-white/60 hover:text-gray-700 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
            />
            <div>
              <h1 className="font-chinese text-3xl font-bold text-gray-900 dark:text-slate-100 md:text-4xl">
                {tr('国策树 · RSIP', 'RSIP Policy Tree')}
              </h1>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-600 dark:text-slate-400">
                {tr('RSIP 流程协同', 'RSIP PROCESS COLLABORATION')}
              </p>
            </div>
          </div>
        </header>

        <div className="mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('tree')}
            className={`rounded-xl px-4 py-2 text-sm transition ${
              activeTab === 'tree'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
            }`}
          >
            {tr('国策树', 'Tree')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`rounded-xl px-4 py-2 text-sm transition ${
              activeTab === 'library'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
            }`}
          >
            {tr('国策库', 'Library')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`rounded-xl px-4 py-2 text-sm transition ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
            }`}
          >
            {tr('轮次历史', 'Runs')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('insights')}
            className={`rounded-xl px-4 py-2 text-sm transition ${
              activeTab === 'insights'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
            }`}
          >
            {tr('高级分析', 'Insights')}
          </button>
        </div>

        {activeTab === 'library' && (
          <RSIPPolicyLibrary
            entries={policyLibrary}
            tree={tree}
            onRestore={handleRestoreFromLibrary}
          />
        )}

        {activeTab === 'history' && <RSIPRunHistory records={runHistory} />}

        {activeTab === 'insights' && (
          <RSIPInsightsPanel
            nodes={nodes}
            runHistory={runHistory}
            executionRecords={executionRecords}
            groups={groups}
            taskLinks={taskLinks}
            policyLibrary={policyLibrary}
          />
        )}

        {activeTab === 'tree' && (
          <>
            <div className="mb-6">
              <RSIPModeSwitch mode={currentMode} onModeChange={handleModeChange} />
            </div>

            {isStrictMode && (
              <RSIPDailyReminder
                hasOpenedToday={hasOpenedToday}
                treeOpenStreak={meta.treeOpenStreak ?? 0}
                onRecordOpened={handleRecordTreeOpened}
              />
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
              groups={groups}
              selectedGroupId={selectedGroupId}
              setSelectedGroupId={setSelectedGroupId}
              createIsPassive={createIsPassive}
              setCreateIsPassive={setCreateIsPassive}
              onCreateGroup={handleCreateGroup}
              onAdd={handleAddSingle}
              language={language}
              tr={tr}
            />

            <div className="bento-card mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {tr(
                    '拆分模式（零散牛皮糖）',
                    'Split mode (shatter oversized policies)',
                  )}
                </h3>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={splitMode}
                    onChange={(event) => setSplitMode(event.target.checked)}
                  />
                  {tr('启用', 'Enable')}
                </label>
              </div>

              {splitMode && (
                <div className="space-y-3">
                  <input
                    value={splitGoal}
                    onChange={(event) => setSplitGoal(event.target.value)}
                    placeholder={tr(
                      '目标，例如：早睡早起',
                      'Goal, e.g. Sleep early and wake early',
                    )}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplySplitTemplate('sleep')}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 dark:bg-slate-700 dark:text-slate-200"
                    >
                      {tr('作息模板', 'Sleep template')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySplitTemplate('exercise')}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 dark:bg-slate-700 dark:text-slate-200"
                    >
                      {tr('运动模板', 'Exercise template')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySplitTemplate('diet')}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 dark:bg-slate-700 dark:text-slate-200"
                    >
                      {tr('饮食模板', 'Diet template')}
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSplitRow}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white"
                    >
                      {tr('新增子国策', 'Add sub-policy')}
                    </button>
                  </div>

                  {splitItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 p-3 dark:border-slate-700 md:grid-cols-12"
                    >
                      <input
                        value={item.title}
                        onChange={(event) =>
                          setSplitItems((prev) =>
                            prev.map((current) =>
                              current.id === item.id
                                ? { ...current, title: event.target.value }
                                : current,
                            ),
                          )
                        }
                        placeholder={tr('子国策标题', 'Sub-policy title')}
                        className="md:col-span-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <input
                        value={item.rule}
                        onChange={(event) =>
                          setSplitItems((prev) =>
                            prev.map((current) =>
                              current.id === item.id
                                ? { ...current, rule: event.target.value }
                                : current,
                            ),
                          )
                        }
                        placeholder={tr('子国策规则', 'Sub-policy rule')}
                        className="md:col-span-6 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <label className="md:col-span-2 inline-flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={item.isPassive}
                          onChange={(event) =>
                            setSplitItems((prev) =>
                              prev.map((current) =>
                                current.id === item.id
                                  ? {
                                      ...current,
                                      isPassive: event.target.checked,
                                    }
                                  : current,
                              ),
                            )
                          }
                        />
                        {tr('被动', 'Passive')}
                      </label>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleSubmitSplit}
                    disabled={!canAddToday || splitItems.length === 0}
                    className={`rounded-xl px-4 py-2 text-sm font-medium ${
                      !canAddToday || splitItems.length === 0
                        ? 'cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-slate-500'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {tr('批量创建拆分国策', 'Create split policies')}
                  </button>
                </div>
              )}
            </div>

            <RSIPCanvas
              nodes={nodes}
              tree={tree}
              onSaveNodes={onSaveNodes}
              onMarkFailedNode={(nodeId: string) => {
                const target = nodes.find((item) => item.id === nodeId);
                if (target) openViolationDialog(target);
              }}
              language={language}
              tr={tr}
            />

            {isStrictMode && nodes.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
                  {tr('定式执行追踪', 'Policy Execution Tracking')}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {nodes.map((node) => {
                    const { descendantCount, failureCost } =
                      calculateConstraintPower(node.id);
                    return (
                      <RSIPStrictModeCard
                        key={node.id}
                        node={node}
                        descendantCount={descendantCount}
                        failureCost={failureCost}
                        onMarkExecuted={() => void handleMarkExecuted(node.id)}
                        onMarkViolated={() => openViolationDialog(node)}
                        onReinforce={
                          onReinforceNode
                            ? () => void onReinforceNode(node.id, nodes, 1)
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8">
              <RSIPTaskLinkPanel
                links={taskLinks}
                nodes={nodes}
                chains={chains}
                onUpsertLinks={async (nextLinks) => {
                  if (onUpsertTaskLinks) {
                    await onUpsertTaskLinks(nextLinks);
                    return;
                  }
                  onSaveTaskLinks?.(nextLinks);
                }}
              />
            </div>
          </>
        )}

        {violationDialogNode && (
          <RSIPViolationDialog
            isOpen={true}
            node={violationDialogNode}
            descendants={nodes.filter((node) =>
              getDescendantIds(nodes, violationDialogNode.id).includes(node.id),
            )}
            groupMessage={violationGroupMessage}
            onConfirm={handleConfirmViolation}
            onCancel={() => {
              setViolationDialogNode(null);
              setViolationGroupMessage(undefined);
            }}
          />
        )}
      </div>
    </div>
  );
};



