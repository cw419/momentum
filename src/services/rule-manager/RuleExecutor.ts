/**
 * RuleExecutor - 规则执行服务
 * 负责规则的执行和验证逻辑
 */

import {
  ExceptionRule,
  RuleUsageRecord,
  SessionContext,
  PauseOptions,
  ExceptionRuleError,
  ExceptionRuleException
} from '../../types';
import { exceptionRuleStorage } from '../ExceptionRuleStorage';
import { ruleClassificationService } from '../RuleClassificationService';
import { ruleUsageTracker } from '../RuleUsageTracker';
import { ruleStateManager } from '../RuleStateManager';
import { logger } from '../../utils/logger';
import { isDev } from '../../utils/env';

export interface RuleExecutionResult {
  record: RuleUsageRecord;
  rule: ExceptionRule;
}

/**
 * 规则执行服务类
 * 单一职责：处理规则的执行和验证
 */
export class RuleExecutor {
  /**
   * 使用规则执行操作（增强版本）
   */
  async useRule(
    ruleId: string,
    sessionContext: SessionContext,
    actionType: 'pause' | 'early_completion',
    pauseOptions?: PauseOptions
  ): Promise<RuleExecutionResult> {
    try {
      if (isDev) {
        logger.debug('RULE_EXECUTOR', 'Validating ruleId', { ruleId });
      }

      const validation = await ruleStateManager.validateRuleId(ruleId);

      if (isDev) {
        logger.debug('RULE_EXECUTOR', 'RuleId validation result', { ruleId, validation });
      }

      if (!validation.isValid) {
        logger.error('RULE_EXECUTOR', 'RuleId validation failed', { ruleId, validation });
        throw new ExceptionRuleException(
          ExceptionRuleError.RULE_NOT_FOUND,
          validation.error || `Rule ID ${ruleId} is invalid`
        );
      }

      const realRuleId = validation.realId || ruleId;
      let rule: ExceptionRule | null = null;

      if (validation.isTemporary) {
        rule = await ruleStateManager.waitForRuleCreation(ruleId);
      } else {
        rule = await exceptionRuleStorage.getRuleById(realRuleId);
      }

      if (!rule) {
        throw new ExceptionRuleException(
          ExceptionRuleError.RULE_NOT_FOUND,
          `Rule ID ${ruleId} does not exist`
        );
      }

      await ruleClassificationService.validateRuleForAction(realRuleId, actionType);

      const record = await ruleUsageTracker.recordUsage(realRuleId, sessionContext, actionType, pauseOptions);

      return { record, rule };
    } catch (error) {
      if (error instanceof ExceptionRuleException) {
        throw error;
      }
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        'Failed to use rule',
        error
      );
    }
  }

  /**
   * 验证规则是否可用于指定操作
   */
  async validateRuleForAction(ruleId: string, actionType: 'pause' | 'early_completion'): Promise<boolean> {
    try {
      await ruleClassificationService.validateRuleForAction(ruleId, actionType);
      return true;
    } catch (error) {
      if (error instanceof ExceptionRuleException) {
        return false;
      }
      throw error;
    }
  }
}

export const ruleExecutor = new RuleExecutor();
