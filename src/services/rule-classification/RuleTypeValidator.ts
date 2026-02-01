/**
 * 规则类型验证（纯逻辑）
 * - 规则类型与操作类型的匹配
 * - 显示名称
 * - 输入类型守卫
 */

import { ExceptionRule, ExceptionRuleType } from '../../types';

export type RuleActionType = 'pause' | 'early_completion';

export function getRuleTypeForAction(actionType: RuleActionType): ExceptionRuleType {
  return actionType === 'pause'
    ? ExceptionRuleType.PAUSE_ONLY
    : ExceptionRuleType.EARLY_COMPLETION_ONLY;
}

export function doesRuleTypeMatchAction(ruleType: ExceptionRuleType, actionType: RuleActionType): boolean {
  switch (actionType) {
    case 'pause':
      return ruleType === ExceptionRuleType.PAUSE_ONLY;
    case 'early_completion':
      return ruleType === ExceptionRuleType.EARLY_COMPLETION_ONLY;
  }
}

export function validateRuleTypeForAction(rule: ExceptionRule, actionType: RuleActionType): boolean {
  if (!rule.type) return false;
  return doesRuleTypeMatchAction(rule.type, actionType);
}

export function getRuleTypeDisplayName(type: ExceptionRuleType): string {
  switch (type) {
    case ExceptionRuleType.PAUSE_ONLY:
      return '仅暂停';
    case ExceptionRuleType.EARLY_COMPLETION_ONLY:
      return '仅提前完成';
    default:
      return '未知类型';
  }
}

export function getActionTypeDisplayName(actionType: RuleActionType): string {
  switch (actionType) {
    case 'pause':
      return '暂停计时';
    case 'early_completion':
      return '提前完成';
    default:
      return '未知操作';
  }
}

export function isValidRuleType(type: string): type is ExceptionRuleType {
  return Object.values(ExceptionRuleType).includes(type as ExceptionRuleType);
}

export function isValidActionType(actionType: string): actionType is RuleActionType {
  return actionType === 'pause' || actionType === 'early_completion';
}

