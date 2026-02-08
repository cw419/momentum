/**
 * 规则分类管理服务
 * 处理例外规则的分类、筛选和类型验证
 */

import type { ExceptionRule } from '../../types';
import { ExceptionRuleType } from '../../types';
import { exceptionRuleStorage } from '../ExceptionRuleStorage';
import { logger } from '../../utils/logger';
import { isDev } from '../../utils/env';
import {
  type RuleActionType,
  doesRuleTypeMatchAction,
  getRuleTypeForAction,
  getRuleTypeDisplayName as getRuleTypeDisplayNamePure,
  getActionTypeDisplayName as getActionTypeDisplayNamePure,
  isValidRuleType as isValidRuleTypePure,
  isValidActionType as isValidActionTypePure,
} from './RuleTypeValidator';
import { groupActiveRulesByType, searchRulesInList } from './RuleSearcher';
import {
  buildRuleTypeChangeSuggestion,
  getRuleTypeStatsFromGrouped,
  getRecommendedRuleTypeFromStats,
  getRuleUsageSuggestionsFromList,
} from './RuleSuggestionEngine';
import { fixRuleTypeIssues } from './ruleTypeFixer';
import { validateRuleForAction } from './ruleValidator';

export class RuleClassificationService {
  async getRulesByType(type: ExceptionRuleType): Promise<ExceptionRule[]> {
    return await exceptionRuleStorage.getRulesByType(type);
  }

  async getRulesGroupedByType(): Promise<
    Record<ExceptionRuleType, ExceptionRule[]>
  > {
    const allRules = await exceptionRuleStorage.getRules();
    return groupActiveRulesByType(allRules);
  }

  validateRuleTypeForAction(
    rule: ExceptionRule,
    actionType: RuleActionType,
  ): boolean {
    if (isDev) {
      logger.debug('RULE_CLASSIFICATION', 'Validating rule type match', {
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.type,
        actionType,
      });
    }

    if (!rule.type) {
      logger.error('RULE_CLASSIFICATION', 'Rule missing type definition', {
        ruleId: rule.id,
        ruleName: rule.name,
      });
      return false;
    }

    const matches = doesRuleTypeMatchAction(rule.type, actionType);

    if (isDev) {
      if (actionType === 'pause') {
        logger.debug('RULE_CLASSIFICATION', 'Pause action match result', {
          pauseMatch: matches,
        });
      } else {
        logger.debug(
          'RULE_CLASSIFICATION',
          'Early completion action match result',
          {
            completionMatch: matches,
          },
        );
      }
    }

    return matches;
  }

  async getRulesForAction(
    actionType: RuleActionType,
  ): Promise<ExceptionRule[]> {
    return await this.getRulesByType(getRuleTypeForAction(actionType));
  }

  async validateRuleForAction(
    ruleId: string,
    actionType: RuleActionType,
  ): Promise<void> {
    return validateRuleForAction({
      ruleId,
      actionType,
      validateRuleTypeForAction: (rule, type) =>
        this.validateRuleTypeForAction(rule, type),
      fixRuleTypeIssues: (id) => this.fixRuleTypeIssues(id),
    });
  }

  async fixRuleTypeIssues(ruleId: string): Promise<{
    fixed: boolean;
    issues: string[];
    actions: string[];
  }> {
    return fixRuleTypeIssues(ruleId);
  }

  async suggestRuleTypeChange(
    ruleId: string,
    desiredAction: RuleActionType,
  ): Promise<string> {
    const rule = await exceptionRuleStorage.getRuleById(ruleId);

    if (!rule) {
      return '规则不存在，无法提供建议';
    }

    return buildRuleTypeChangeSuggestion(rule, desiredAction);
  }

  async getRuleTypeStats(): Promise<{
    total: number;
    pauseOnly: number;
    earlyCompletionOnly: number;
    mostUsedType: ExceptionRuleType | null;
    leastUsedType: ExceptionRuleType | null;
  }> {
    const grouped = await this.getRulesGroupedByType();
    return getRuleTypeStatsFromGrouped(grouped);
  }

  async getRecommendedRuleType(
    basedOnUsage: boolean = true,
  ): Promise<ExceptionRuleType> {
    if (!basedOnUsage) {
      return ExceptionRuleType.PAUSE_ONLY;
    }

    const stats = await this.getRuleTypeStats();
    return getRecommendedRuleTypeFromStats(stats, true);
  }

  async searchRules(
    query: string,
    type?: ExceptionRuleType,
  ): Promise<ExceptionRule[]> {
    let rules: ExceptionRule[];

    if (type) {
      rules = await this.getRulesByType(type);
    } else {
      const allRules = await exceptionRuleStorage.getRules();
      rules = allRules.filter((rule) => rule.isActive);
    }

    if (!query.trim()) {
      return rules;
    }

    return searchRulesInList(rules, query);
  }

  getRuleTypeDisplayName(type: ExceptionRuleType): string {
    return getRuleTypeDisplayNamePure(type);
  }

  getActionTypeDisplayName(actionType: RuleActionType): string {
    return getActionTypeDisplayNamePure(actionType);
  }

  isValidRuleType(type: string): type is ExceptionRuleType {
    return isValidRuleTypePure(type);
  }

  isValidActionType(actionType: string): actionType is RuleActionType {
    return isValidActionTypePure(actionType);
  }

  async getRuleUsageSuggestions(actionType: RuleActionType): Promise<{
    mostUsed: ExceptionRule[];
    recentlyUsed: ExceptionRule[];
    suggested: ExceptionRule[];
  }> {
    const rules = await this.getRulesForAction(actionType);
    return getRuleUsageSuggestionsFromList(rules);
  }
}

export const ruleClassificationService = new RuleClassificationService();
