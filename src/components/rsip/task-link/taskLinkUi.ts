import type { RSIPTaskLink } from '../../../types';

export type TaskLinkMode = 'task_to_rsip' | 'rsip_to_task';
export type Tr = (zh: string, en: string) => string;

export const EVENTS: Record<TaskLinkMode, RSIPTaskLink['triggerEvent'][]> = {
  task_to_rsip: ['task_completed', 'task_interrupted', 'group_cycle_completed'],
  rsip_to_task: ['rsip_mark_executed'],
};
export const EFFECTS: Record<TaskLinkMode, RSIPTaskLink['effect'][]> = {
  task_to_rsip: ['mark_rsip_executed', 'mark_rsip_violated'],
  rsip_to_task: ['prompt_start_chain', 'prompt_schedule_chain'],
};

export function eventLabel(event: RSIPTaskLink['triggerEvent'], tr: Tr) {
  if (event === 'task_completed') return tr('任务完成', 'Task completed');
  if (event === 'task_interrupted') return tr('任务中断', 'Task interrupted');
  if (event === 'group_cycle_completed')
    return tr('任务组周期完成', 'Group cycle completed');
  return tr('RSIP 标记已执行', 'RSIP marked executed');
}

export function effectLabel(effect: RSIPTaskLink['effect'], tr: Tr) {
  if (effect === 'mark_rsip_executed')
    return tr('标记国策已执行', 'Mark RSIP executed');
  if (effect === 'mark_rsip_violated')
    return tr('标记国策已违反', 'Mark RSIP violated');
  if (effect === 'prompt_start_chain')
    return tr('提示立即开始任务', 'Prompt start task');
  return tr('提示安排任务', 'Prompt schedule task');
}

export function automationLabel(
  automation: RSIPTaskLink['automation'],
  tr: Tr,
) {
  return automation === 'auto' ? tr('自动', 'Auto') : tr('需确认', 'Confirm');
}
