import type { ExceptionRule } from '../../types';
import { exceptionRuleStorage } from '../ExceptionRuleStorage';
import { logger } from '../../utils/logger';
import { toError, getErrorMessage } from '../../utils/errorMessage';
import { RuleStateStore } from './RuleStateStore';

export class RuleStateQueries {
  constructor(private readonly store: RuleStateStore) {}

  async ruleExists(ruleId: string): Promise<boolean> {
    if (this.store.hasPendingCreation(ruleId)) {
      return true;
    }

    const realId = this.store.getRealRuleId(ruleId);
    if (realId && realId !== ruleId) {
      const rule = await exceptionRuleStorage.getRuleById(realId);
      return rule !== null;
    }

    const rule = await exceptionRuleStorage.getRuleById(ruleId);
    return rule !== null;
  }

  async getRule(ruleId: string): Promise<ExceptionRule | null> {
    const pending = this.store.getPendingCreation(ruleId);
    if (pending) {
      try {
        return await pending.promise;
      } catch (error) {
        const err = toError(error);
        logger.error('RULE_STATE', '获取临时规则失败', { ruleId }, err);
        return null;
      }
    }

    const realId = this.store.getRealRuleId(ruleId);
    if (realId && realId !== ruleId) {
      return await exceptionRuleStorage.getRuleById(realId);
    }

    return await exceptionRuleStorage.getRuleById(ruleId);
  }

  async validateRuleId(ruleId: string): Promise<{
    isValid: boolean;
    isTemporary: boolean;
    realId?: string;
    error?: string;
  }> {
    try {
      const isTemporary = ruleId.startsWith('temp_');

      if (isTemporary) {
        const pending = this.store.getPendingCreation(ruleId);
        if (pending) {
          return {
            isValid: true,
            isTemporary: true,
            realId: undefined,
          };
        }

        const realId = this.store.getRealRuleId(ruleId);
        if (realId) {
          return {
            isValid: true,
            isTemporary: true,
            realId,
          };
        }

        return {
          isValid: false,
          isTemporary: true,
          error: '临时规则不存在或已过期',
        };
      }

      const rule = await exceptionRuleStorage.getRuleById(ruleId);
      return {
        isValid: rule !== null,
        isTemporary: false,
        realId: ruleId,
        error: rule ? undefined : '规则不存在',
      };
    } catch (error) {
      return {
        isValid: false,
        isTemporary: false,
        error: getErrorMessage(error),
      };
    }
  }

  async syncRuleStates(): Promise<void> {
    try {
      const allRules = await exceptionRuleStorage.getRules();

      for (const rule of allRules) {
        this.store.trackRuleState(rule.id, 'active');
      }

      const existingIds = new Set(allRules.map((r) => r.id));
      this.store.syncStates(existingIds);
    } catch (error) {
      const err = toError(error);
      logger.error('RULE_STATE', '同步规则状态失败', undefined, err);
    }
  }
}
