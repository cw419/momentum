import { ExceptionRuleError, type ExceptionRule } from '../../types';
import { exceptionRuleStorage } from '../ExceptionRuleStorage';
import { getErrorMessage } from '../../utils/errorMessage';
import { ignoreUnused } from '../../utils/ignoreUnused';
import {
  getCachedPreValidation,
  setCachedPreValidation,
  cleanupExpiredCache,
  clearValidationCache,
} from './cache';
import type { ActionType, RuleValidationResult } from './types';
import { validateRulesIntegrity } from './validators/integrity';
import { validateRuleTypeForAction } from './validators/typeMatch';

class EnhancedRuleValidationService {
  validateRuleTypeForAction(
    rule: ExceptionRule,
    actionType: ActionType,
  ): RuleValidationResult {
    return validateRuleTypeForAction(rule, actionType);
  }

  async preValidateRuleUsage(
    ruleId: string,
    actionType: ActionType,
  ): Promise<RuleValidationResult> {
    const cacheKey = `prevalidate_${ruleId}_${actionType}`;

    const cached = getCachedPreValidation(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const rule = await exceptionRuleStorage.getRuleById(ruleId);

      if (!rule) {
        const result: RuleValidationResult = {
          isValid: false,
          errorType: ExceptionRuleError.RULE_NOT_FOUND,
          errorMessage: `规则 ID ${ruleId} 不存在`,
          suggestedActions: [
            {
              type: 'create_new',
              label: '创建新规则',
              description: '创建一个新的规则来替代缺失的规则',
              handler: async () => ignoreUnused(ruleId, actionType),
            },
          ],
          debugInfo: { ruleId, actionType },
        };

        setCachedPreValidation(cacheKey, result);
        return result;
      }

      if (!rule.isActive) {
        const result: RuleValidationResult = {
          isValid: false,
          errorType: ExceptionRuleError.RULE_NOT_FOUND,
          errorMessage: `规则 "${rule.name}" 已被删除或停用`,
          suggestedActions: [
            {
              type: 'use_existing',
              label: '选择其他规则',
              description: '选择一个激活的规则',
              handler: async () => ignoreUnused(ruleId, actionType),
            },
          ],
          debugInfo: { rule, actionType },
        };

        setCachedPreValidation(cacheKey, result);
        return result;
      }

      const typeValidation = this.validateRuleTypeForAction(rule, actionType);

      setCachedPreValidation(cacheKey, typeValidation);

      return typeValidation;
    } catch (error) {
      return {
        isValid: false,
        errorType: ExceptionRuleError.STORAGE_ERROR,
        errorMessage: `预验证失败: ${getErrorMessage(error)}`,
        debugInfo: { ruleId, actionType, error },
      };
    }
  }

  validateRulesIntegrity(rules?: ExceptionRule[]) {
    return validateRulesIntegrity(rules);
  }

  clearValidationCache(): void {
    clearValidationCache();
  }

  cleanupExpiredCache(): void {
    cleanupExpiredCache();
  }
}

export const enhancedRuleValidationService =
  new EnhancedRuleValidationService();
