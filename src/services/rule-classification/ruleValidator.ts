import type { ExceptionRule } from '../../types';
import { ExceptionRuleError, ExceptionRuleType, EnhancedExceptionRuleException } from '../../types';
import { exceptionRuleStorage } from '../ExceptionRuleStorage';
import { logger } from '../../utils/logger';
import { isDev } from '../../utils/env';
import type { RuleActionType } from './RuleTypeValidator';

type FixRuleTypeIssues = (ruleId: string) => Promise<{
  fixed: boolean;
  issues: string[];
  actions: string[];
}>;

type ValidateRuleTypeForAction = (rule: ExceptionRule, actionType: RuleActionType) => boolean;

async function getActiveRuleOrThrow(ruleId: string, actionType: RuleActionType): Promise<ExceptionRule> {
  const rule = await exceptionRuleStorage.getRuleById(ruleId);

  if (!rule) {
    throw EnhancedExceptionRuleException.createUserFriendly(
      ExceptionRuleError.RULE_NOT_FOUND,
      '找不到指定的规则，可能已被删除',
      `规则 ID ${ruleId} 不存在`,
      { ruleId, actionType }
    )
      .addSuggestedAction('创建新规则')
      .addSuggestedAction('选择其他规则');
  }

  if (!rule.isActive) {
    throw EnhancedExceptionRuleException.createUserFriendly(
      ExceptionRuleError.RULE_NOT_FOUND,
      '规则已被删除或停用',
      `规则 "${rule.name}" 已被删除`,
      { rule, actionType }
    )
      .addSuggestedAction('选择其他规则')
      .addSuggestedAction('恢复规则');
  }

  return rule;
}

async function ensureRuleTypeOrThrow(
  rule: ExceptionRule,
  ruleId: string,
  actionType: RuleActionType,
  fixRuleTypeIssues: FixRuleTypeIssues
): Promise<void> {
  if (rule.type) return;

  const fixResult = await fixRuleTypeIssues(ruleId);
  if (!fixResult.fixed) {
    throw EnhancedExceptionRuleException.createUserFriendly(
      ExceptionRuleError.INVALID_RULE_TYPE,
      '规则类型缺失，无法使用',
      `规则 "${rule.name}" 缺少类型定义`,
      { rule, actionType }
    )
      .addSuggestedAction('修复规则类型')
      .addSuggestedAction('选择其他规则');
  }

  logger.info('RULE_CLASSIFICATION', '已自动修复规则类型问题', {
    ruleId,
    actions: fixResult.actions,
  });

  const fixedRule = await exceptionRuleStorage.getRuleById(ruleId);
  if (!fixedRule?.type) {
    throw EnhancedExceptionRuleException.createUserFriendly(
      ExceptionRuleError.INVALID_RULE_TYPE,
      '规则类型缺失，无法使用',
      `规则 "${rule.name}" 缺少类型定义`,
      { rule, actionType }
    )
      .addSuggestedAction('修复规则类型')
      .addSuggestedAction('选择其他规则');
  }

  rule.type = fixedRule.type;
}

function ensureRuleTypeMatchesActionOrThrow(
  rule: ExceptionRule,
  actionType: RuleActionType,
  validateRuleTypeForAction: ValidateRuleTypeForAction
): void {
  const isValidForAction = validateRuleTypeForAction(rule, actionType);
  if (isValidForAction) return;

  const actionName = actionType === 'pause' ? '暂停' : '提前完成';
  const messageActionName = actionType === 'pause' ? '暂停计时' : actionName;
  const typeName = rule.type === ExceptionRuleType.PAUSE_ONLY ? '暂停' : '提前完成';

  throw EnhancedExceptionRuleException.createUserFriendly(
    ExceptionRuleError.RULE_TYPE_MISMATCH,
    `规则类型与操作不匹配`,
    `规则 "${rule.name}" 是${typeName}类型，不能用于${messageActionName}操作`,
    { rule, actionType, expectedType: actionName, actualType: typeName }
  )
    .addSuggestedAction(`创建${actionName}类型的规则`)
    .addSuggestedAction(`选择${actionName}类型的规则`);
}

export async function validateRuleForAction(args: {
  ruleId: string;
  actionType: RuleActionType;
  validateRuleTypeForAction: ValidateRuleTypeForAction;
  fixRuleTypeIssues: FixRuleTypeIssues;
}): Promise<void> {
  const { ruleId, actionType, validateRuleTypeForAction, fixRuleTypeIssues } = args;

  try {
    const rule = await getActiveRuleOrThrow(ruleId, actionType);
    await ensureRuleTypeOrThrow(rule, ruleId, actionType, fixRuleTypeIssues);
    ensureRuleTypeMatchesActionOrThrow(rule, actionType, validateRuleTypeForAction);

    if (isDev) {
      logger.debug('RULE_CLASSIFICATION', 'Rule validation passed', { ruleId, actionType });
    }
  } catch (error) {
    if (error instanceof EnhancedExceptionRuleException) {
      throw error;
    }

    throw EnhancedExceptionRuleException.createUserFriendly(
      ExceptionRuleError.VALIDATION_ERROR,
      '规则验证过程中发生错误',
      error instanceof Error ? error.message : '未知错误',
      { ruleId, actionType, error }
    )
      .addSuggestedAction('重试操作')
      .addSuggestedAction('选择其他规则');
  }
}

