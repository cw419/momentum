import { useEffect, useMemo, useState } from 'react';
import type { Chain, RSIPNode, RSIPTaskLink } from '../../types';
import { useI18n } from '../../i18n';

interface RSIPTaskLinkPanelProps {
  links: RSIPTaskLink[];
  nodes: RSIPNode[];
  chains: Chain[];
  onUpsertLinks: (links: RSIPTaskLink[]) => void | Promise<unknown>;
  fixedChainId?: string;
  title?: string;
  description?: string;
}

const TASK_TO_RSIP_EVENTS: RSIPTaskLink['triggerEvent'][] = [
  'task_completed',
  'task_interrupted',
  'group_cycle_completed',
];

const RSIP_TO_TASK_EVENTS: RSIPTaskLink['triggerEvent'][] = [
  'rsip_mark_executed',
];

const TASK_TO_RSIP_EFFECTS: RSIPTaskLink['effect'][] = [
  'mark_rsip_executed',
  'mark_rsip_violated',
];

const RSIP_TO_TASK_EFFECTS: RSIPTaskLink['effect'][] = [
  'prompt_start_chain',
  'prompt_schedule_chain',
];

function eventLabel(
  event: RSIPTaskLink['triggerEvent'],
  tr: (zh: string, en: string) => string,
): string {
  if (event === 'task_completed') return tr('任务完成', 'Task completed');
  if (event === 'task_interrupted') return tr('任务中断', 'Task interrupted');
  if (event === 'group_cycle_completed')
    return tr('任务组周期完成', 'Group cycle completed');
  return tr('RSIP 标记已执行', 'RSIP marked executed');
}

function effectLabel(
  effect: RSIPTaskLink['effect'],
  tr: (zh: string, en: string) => string,
): string {
  if (effect === 'mark_rsip_executed')
    return tr('标记国策已执行', 'Mark RSIP executed');
  if (effect === 'mark_rsip_violated')
    return tr('标记国策已违反', 'Mark RSIP violated');
  if (effect === 'prompt_start_chain')
    return tr('提示立即开始任务', 'Prompt start task');
  return tr('提示安排任务', 'Prompt schedule task');
}

function automationLabel(
  automation: RSIPTaskLink['automation'],
  tr: (zh: string, en: string) => string,
): string {
  return automation === 'auto' ? tr('自动', 'Auto') : tr('需确认', 'Confirm');
}

export function RSIPTaskLinkPanel({
  links,
  nodes,
  chains,
  onUpsertLinks,
  fixedChainId,
  title,
  description,
}: RSIPTaskLinkPanelProps) {
  const { tr } = useI18n();
  const resolvedTitle =
    title ?? tr('RSIP × 任务流程协同', 'RSIP <-> Task Integration');
  const resolvedDescription =
    description ??
    tr(
      '任务事件可自动更新 RSIP；RSIP -> 任务动作默认需确认。冲突采用最后写入生效（LWW）。',
      'Task events can auto-update RSIP. RSIP->task actions default to confirmation. Link conflicts use last-write-wins (latest update).',
    );

  const [mode, setMode] = useState<'task_to_rsip' | 'rsip_to_task'>(
    'task_to_rsip',
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [selectedChainId, setSelectedChainId] = useState<string>(
    fixedChainId ?? '',
  );
  const [triggerEvent, setTriggerEvent] =
    useState<RSIPTaskLink['triggerEvent']>('task_completed');
  const [effect, setEffect] =
    useState<RSIPTaskLink['effect']>('mark_rsip_executed');
  const [automation, setAutomation] =
    useState<RSIPTaskLink['automation']>('confirm');

  const availableChains = useMemo(() => {
    if (!fixedChainId) return chains;
    return chains.filter((chain) => chain.id === fixedChainId);
  }, [chains, fixedChainId]);

  const visibleLinks = useMemo(() => {
    if (!fixedChainId) return links;
    return links.filter((link) => link.chainId === fixedChainId);
  }, [fixedChainId, links]);

  useEffect(() => {
    if (fixedChainId) {
      setSelectedChainId(fixedChainId);
      return;
    }
    setSelectedChainId((current) => {
      if (!current) return '';
      return availableChains.some((chain) => chain.id === current)
        ? current
        : '';
    });
  }, [availableChains, fixedChainId]);

  const chainKind = useMemo<RSIPTaskLink['chainKind']>(() => {
    const chain = chains.find((item) => item.id === selectedChainId);
    return chain?.type === 'group' ? 'group' : 'unit';
  }, [chains, selectedChainId]);

  const canCreate = selectedNodeId.length > 0 && selectedChainId.length > 0;

  const nodeTitleById = useMemo(() => {
    const entries = nodes.map(
      (node) =>
        [node.id, (node.emoji ? `${node.emoji} ` : '') + node.title] as const,
    );
    return new Map(entries);
  }, [nodes]);

  const chainLabelById = useMemo(() => {
    const entries = chains.map(
      (chain) =>
        [
          chain.id,
          `${chain.type === 'group' ? tr('任务组', 'Group') : tr('任务', 'Task')}: ${chain.name}`,
        ] as const,
    );
    return new Map(entries);
  }, [chains, tr]);

  const handleModeChange = (nextMode: 'task_to_rsip' | 'rsip_to_task') => {
    setMode(nextMode);
    if (nextMode === 'task_to_rsip') {
      setTriggerEvent('task_completed');
      setEffect('mark_rsip_executed');
      setAutomation('auto');
    } else {
      setTriggerEvent('rsip_mark_executed');
      setEffect('prompt_start_chain');
      setAutomation('confirm');
    }
  };

  const handleCreate = async () => {
    if (!canCreate) return;

    const nextLink: RSIPTaskLink = {
      id: crypto.randomUUID(),
      rsipNodeId: selectedNodeId,
      chainId: selectedChainId,
      chainKind,
      triggerEvent,
      effect,
      automation,
      isActive: true,
      updatedAt: new Date(),
    };

    await onUpsertLinks([...links, nextLink]);
  };

  const handleToggle = async (linkId: string) => {
    const next = links.map((link) =>
      link.id === linkId
        ? {
            ...link,
            isActive: !link.isActive,
            updatedAt: new Date(),
          }
        : link,
    );
    await onUpsertLinks(next);
  };

  const handleDelete = async (linkId: string) => {
    await onUpsertLinks(links.filter((link) => link.id !== linkId));
  };

  return (
    <div className="space-y-4">
      <div className="bento-card">
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-slate-100">
          {resolvedTitle}
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-slate-300">
          {resolvedDescription}
        </p>

        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => handleModeChange('task_to_rsip')}
            className={`rounded-xl px-3 py-2 text-sm transition ${
              mode === 'task_to_rsip'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
            }`}
          >
            {tr('任务 -> RSIP', 'Task -> RSIP')}
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('rsip_to_task')}
            className={`rounded-xl px-3 py-2 text-sm transition ${
              mode === 'rsip_to_task'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
            }`}
          >
            {tr('RSIP -> 任务', 'RSIP -> Task')}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select
            value={selectedNodeId}
            onChange={(event) => setSelectedNodeId(event.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">{tr('选择 RSIP 节点', 'Select RSIP node')}</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.emoji ? `${node.emoji} ` : ''}
                {node.title}
              </option>
            ))}
          </select>

          {!fixedChainId && (
            <select
              value={selectedChainId}
              onChange={(event) => setSelectedChainId(event.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">
                {tr('选择任务/任务组', 'Select task/group')}
              </option>
              {availableChains.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.type === 'group'
                    ? tr('任务组', 'Group')
                    : tr('任务', 'Task')}
                  : {chain.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={triggerEvent}
            onChange={(event) =>
              setTriggerEvent(
                event.target.value as RSIPTaskLink['triggerEvent'],
              )
            }
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {(mode === 'task_to_rsip'
              ? TASK_TO_RSIP_EVENTS
              : RSIP_TO_TASK_EVENTS
            ).map((event) => (
              <option key={event} value={event}>
                {eventLabel(event, tr)} ({event})
              </option>
            ))}
          </select>

          <select
            value={effect}
            onChange={(event) =>
              setEffect(event.target.value as RSIPTaskLink['effect'])
            }
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {(mode === 'task_to_rsip'
              ? TASK_TO_RSIP_EFFECTS
              : RSIP_TO_TASK_EFFECTS
            ).map((currentEffect) => (
              <option key={currentEffect} value={currentEffect}>
                {effectLabel(currentEffect, tr)} ({currentEffect})
              </option>
            ))}
          </select>

          <select
            value={automation}
            onChange={(event) =>
              setAutomation(event.target.value as RSIPTaskLink['automation'])
            }
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="auto">{automationLabel('auto', tr)}</option>
            <option value="confirm">{automationLabel('confirm', tr)}</option>
          </select>

          <button
            type="button"
            disabled={!canCreate}
            onClick={() => void handleCreate()}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              canCreate
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-slate-500'
            }`}
          >
            {tr('新增联动', 'Add link')}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {visibleLinks.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-slate-700 dark:text-slate-400">
            {tr('尚未配置任何联动。', 'No integration links yet.')}
          </div>
        )}

        {visibleLinks.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
          >
            <div>
              <p className="font-medium">
                {eventLabel(link.triggerEvent, tr)} {'->'}{' '}
                {effectLabel(link.effect, tr)}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {tr('节点', 'Node')}:{' '}
                {nodeTitleById.get(link.rsipNodeId) ?? link.rsipNodeId}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {tr('目标', 'Target')}:{' '}
                {chainLabelById.get(link.chainId) ?? link.chainId} |{' '}
                {link.chainKind === 'group'
                  ? tr('任务组', 'Group')
                  : tr('任务', 'Task')}{' '}
                | {automationLabel(link.automation, tr)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleToggle(link.id)}
                className={`rounded-lg px-3 py-1.5 text-xs transition ${
                  link.isActive
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {link.isActive
                  ? tr('已启用', 'Enabled')
                  : tr('已禁用', 'Disabled')}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(link.id)}
                className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs text-red-700 transition hover:bg-red-500/30 dark:text-red-300"
              >
                {tr('删除', 'Delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
