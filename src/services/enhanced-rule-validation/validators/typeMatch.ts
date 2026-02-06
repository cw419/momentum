import {
  ExceptionRule,
  ExceptionRuleError,
  ExceptionRuleException,
  ExceptionRuleType,
} from '../../../types';
import { getErrorMessage } from '../../../utils/errorMessage';
import { ignoreUnused } from '../../../utils/ignoreUnused';
import type { ActionType, RuleValidationResult, ValidationAction } from '../types';

function checkTypeActionMatch(ruleType: ExceptionRuleType, actionType: ActionType): boolean {
  switch (actionType) {
    case 'pause':
      return ruleType === ExceptionRuleType.PAUSE_ONLY;
    case 'early_completion':
      return ruleType === ExceptionRuleType.EARLY_COMPLETION_ONLY;
    default:
      return false;
  }
}

function isValidRuleType(type: string): type is ExceptionRuleType {
  return Object.values(ExceptionRuleType).includes(type as ExceptionRuleType);
}

function isValidActionType(actionType: string): actionType is ActionType {
  return actionType === 'pause' || actionType === 'early_completion';
}

function getRuleTypeDisplayName(type: ExceptionRuleType): string {
  switch (type) {
    case ExceptionRuleType.PAUSE_ONLY:
      return '暂停';
    case ExceptionRuleType.EARLY_COMPLETION_ONLY:
      return '提前完成';
    default:
      return '未知类型';
  }
}

function getActionTypeDisplayName(actionType: ActionType): string {
  switch (actionType) {
    case 'pause':
      return '暂停';
    case 'early_completion':
      return '提前完成';
    default:
      return '未知操作';
  }
}

function getSuggestedActionsForMismatch(rule: ExceptionRule, actionType: ActionType): ValidationAction[] {
  const correctType =
    actionType === 'pause' ? ExceptionRuleType.PAUSE_ONLY : ExceptionRuleType.EARLY_COMPLETION_ONLY;

  const actionName = getActionTypeDisplayName(actionType);
  ignoreUnused(rule, correctType);

  return [
    {
      type: 'create_new',
      label: `创建${actionName}规则`,
      description: `创建一个新的${actionName}类型规则`,
      handler: async () => ignoreUnused(rule, actionType),
    },
    {
      type: 'use_existing',
      label: `选择${actionName}规则`,
      description: `从现有的${actionName}规则中选择`,
      handler: async () => ignoreUnused(rule, actionType),
    },
  ];
}

export function validateRuleTypeForAction(rule: ExceptionRule, actionType: ActionType): RuleValidationResult {
  try {
    if (!rule) {
      return {
        isValid: false,
        errorType: ExceptionRuleError.RULE_NOT_FOUND,
        errorMessage: '规则对象为空',
        debugInfo: { rule, actionType },
      };
    }

    if (!rule.type) {
      return {
        isValid: false,
        errorType: ExceptionRuleError.INVALID_RULE_TYPE,
        errorMessage: `规则 "${rule.name}" 缺少类型定义`,
        suggestedActions: [
          {
            type: 'fix_data',
            label: '修复规则类型',
            description: '为规则设置正确的类型',
            handler: async () => ignoreUnused(rule, actionType),
          },
        ],
        debugInfo: { rule, actionType },
      };
    }

    const validRuleType = isValidRuleType(rule.type);
    if (!validRuleType) {
      return {
        isValid: false,
        errorType: ExceptionRuleError.INVALID_RULE_TYPE,
        errorMessage: `规则 "${rule.name}" 的类型 "${rule.type}" 无效`,
        debugInfo: { rule, actionType, validTypes: Object.values(ExceptionRuleType) },
      };
    }

    const validActionType = isValidActionType(actionType);
    if (!validActionType) {
      return {
        isValid: false,
        errorType: ExceptionRuleError.VALIDATION_ERROR,
        errorMessage: `操作类型 "${actionType}" 无效`,
        debugInfo: { rule, actionType, validActions: ['pause', 'early_completion'] },
      };
    }

    const matches = checkTypeActionMatch(rule.type, actionType);
    if (!matches) {
      const ruleTypeName = getRuleTypeDisplayName(rule.type);
      const actionName = getActionTypeDisplayName(actionType);

      return {
        isValid: false,
        errorType: ExceptionRuleError.RULE_TYPE_MISMATCH,
        errorMessage: `规则 "${rule.name}" 是${ruleTypeName}类型，不能用于${actionName}操作`,
        suggestedActions: getSuggestedActionsForMismatch(rule, actionType),
        debugInfo: { rule, actionType, ruleTypeName, actionName },
      };
    }

    return {
      isValid: true,
      debugInfo: { rule, actionType, match: true },
    };
  } catch (error) {
    const isExpectedError = error instanceof ExceptionRuleException;
    ignoreUnused(isExpectedError);

    return {
      isValid: false,
      errorType: ExceptionRuleError.VALIDATION_ERROR,
      errorMessage: `验证过程中发生错误: ${getErrorMessage(error)}`,
      debugInfo: { rule, actionType, error },
    };
  }
}

