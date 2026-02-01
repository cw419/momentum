/**
 * 规则分类管理服务
 * 处理例外规则的分类、筛选和类型验证
 */

import { ExceptionRule, ExceptionRuleType, ExceptionRuleError, EnhancedExceptionRuleException } from '../types';
import { exceptionRuleStorage } from './ExceptionRuleStorage';
import { logger } from '../utils/logger';
import { isDev } from '../utils/env';
import {
  RuleActionType,
  doesRuleTypeMatchAction,
  getRuleTypeForAction,
  getRuleTypeDisplayName as getRuleTypeDisplayNamePure,
  getActionTypeDisplayName as getActionTypeDisplayNamePure,
  isValidRuleType as isValidRuleTypePure,
  isValidActionType as isValidActionTypePure,
} from './rule-classification/RuleTypeValidator';
import { groupActiveRulesByType, searchRulesInList } from './rule-classification/RuleSearcher';
import {
  buildRuleTypeChangeSuggestion,
  getRuleTypeStatsFromGrouped,
  getRecommendedRuleTypeFromStats,
  getRuleUsageSuggestionsFromList,
} from './rule-classification/RuleSuggestionEngine';

export class RuleClassificationService {
  /**
   * 根据类型获取规则
   */
  async getRulesByType(type: ExceptionRuleType): Promise<ExceptionRule[]> {
    return await exceptionRuleStorage.getRulesByType(type);
  }

  /**
   * 获取所有规则并按类型分组
   */
  async getRulesGroupedByType(): Promise<Record<ExceptionRuleType, ExceptionRule[]>> {
    const allRules = await exceptionRuleStorage.getRules();
    return groupActiveRulesByType(allRules);
  }

  /**
   * 验证规则类型是否匹配指定操作
   */
  validateRuleTypeForAction(rule: ExceptionRule, actionType: RuleActionType): boolean {
    if (isDev) {
      logger.debug('RULE_CLASSIFICATION', 'Validating rule type match', {
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.type,
        actionType,
      });
    }
    
    // 确保规则类型有效
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
        logger.debug('RULE_CLASSIFICATION', 'Pause action match result', { pauseMatch: matches });
      } else {
        logger.debug('RULE_CLASSIFICATION', 'Early completion action match result', { completionMatch: matches });
      }
    }

    return matches;
  }

  /**
   * 获取适用于指定操作的规则
   */
  async getRulesForAction(actionType: RuleActionType): Promise<ExceptionRule[]> {
    return await this.getRulesByType(getRuleTypeForAction(actionType));
  }

  /**
   * 验证规则是否可以用于指定操作，如果不可以则抛出异常（增强版本）
   */
  private async getActiveRuleOrThrow(ruleId: string, actionType: RuleActionType): Promise<ExceptionRule> {
    const rule = await exceptionRuleStorage.getRuleById(ruleId);

    if (!rule) {
      throw EnhancedExceptionRuleException.createUserFriendly(
        ExceptionRuleError.RULE_NOT_FOUND,
        '找不到指定的规则，可能已被删除',
        `规则 ID ${ruleId} 不存在`,
        { ruleId, actionType }
      ).addSuggestedAction('创建新规则').addSuggestedAction('选择其他规则');
    }

    if (!rule.isActive) {
      throw EnhancedExceptionRuleException.createUserFriendly(
        ExceptionRuleError.RULE_NOT_FOUND,
        '规则已被删除或停用',
        `规则 "${rule.name}" 已被删除`,
        { rule, actionType }
      ).addSuggestedAction('选择其他规则').addSuggestedAction('恢复规则');
    }

    return rule;
  }

  private async ensureRuleTypeOrThrow(rule: ExceptionRule, ruleId: string, actionType: RuleActionType) {
    if (rule.type) return;

    const fixResult = await this.fixRuleTypeIssues(ruleId);
    if (!fixResult.fixed) {
      throw EnhancedExceptionRuleException.createUserFriendly(
        ExceptionRuleError.INVALID_RULE_TYPE,
        '规则类型缺失，无法使用',
        `规则 "${rule.name}" 缺少类型定义`,
        { rule, actionType }
      ).addSuggestedAction('修复规则类型').addSuggestedAction('选择其他规则');
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
      ).addSuggestedAction('修复规则类型').addSuggestedAction('选择其他规则');
    }

    rule.type = fixedRule.type;
  }

  private ensureRuleTypeMatchesActionOrThrow(rule: ExceptionRule, actionType: RuleActionType) {
    const isValidForAction = this.validateRuleTypeForAction(rule, actionType);
    if (isValidForAction) return;

    const actionName = actionType === 'pause' ? '暂停' : '提前完成';
    const messageActionName = actionType === 'pause' ? '暂停计时' : actionName;
    const typeName = rule.type === ExceptionRuleType.PAUSE_ONLY ? '暂停' : '提前完成';

    throw EnhancedExceptionRuleException.createUserFriendly(
      ExceptionRuleError.RULE_TYPE_MISMATCH,
      `规则类型与操作不匹配`,
      `规则 "${rule.name}" 是${typeName}类型，不能用于${messageActionName}操作`,
      { rule, actionType, expectedType: actionName, actualType: typeName }
    ).addSuggestedAction(`创建${actionName}类型的规则`).addSuggestedAction(`选择${actionName}类型的规则`);
  }

  async validateRuleForAction(ruleId: string, actionType: RuleActionType): Promise<void> {
    try {
      const rule = await this.getActiveRuleOrThrow(ruleId, actionType);
      await this.ensureRuleTypeOrThrow(rule, ruleId, actionType);
      this.ensureRuleTypeMatchesActionOrThrow(rule, actionType);

      if (isDev) {
        logger.debug('RULE_CLASSIFICATION', 'Rule validation passed', { ruleId, actionType });
      }

    } catch (error) {
      if (error instanceof EnhancedExceptionRuleException) {
        throw error;
      }

      // 处理其他错误
      throw EnhancedExceptionRuleException.createUserFriendly(
        ExceptionRuleError.VALIDATION_ERROR,
        '规则验证过程中发生错误',
        error instanceof Error ? error.message : '未知错误',
        { ruleId, actionType, error }
      ).addSuggestedAction('重试操作').addSuggestedAction('选择其他规则');
    }
  }

  /**
   * 修复规则类型问题
   */
  async fixRuleTypeIssues(ruleId: string): Promise<{
    fixed: boolean;
    issues: string[];
    actions: string[];
  }> {
    try {
      const rule = await exceptionRuleStorage.getRuleById(ruleId);
      const issues: string[] = [];
      const actions: string[] = [];
      let fixed = false;

      if (!rule) {
        return {
          fixed: false,
          issues: ['规则不存在'],
          actions: ['创建新规则']
        };
      }

      // 检查规则类型
      if (!rule.type) {
        issues.push('规则缺少类型定义');
        // 自动修复：设置默认类型
        rule.type = ExceptionRuleType.PAUSE_ONLY;
        await exceptionRuleStorage.updateRule(ruleId, { type: rule.type });
        actions.push('已设置默认类型为暂停');
        fixed = true;
      } else if (!Object.values(ExceptionRuleType).includes(rule.type)) {
        issues.push(`规则类型无效: ${rule.type}`);
        // 自动修复：设置为有效类型
        rule.type = ExceptionRuleType.PAUSE_ONLY;
        await exceptionRuleStorage.updateRule(ruleId, { type: rule.type });
        actions.push('已修复为有效的规则类型');
        fixed = true;
      }

      // 检查其他必需字段
      if (!rule.name || rule.name.trim().length === 0) {
        issues.push('规则名称为空');
        actions.push('需要设置规则名称');
      }

      if (!rule.createdAt) {
        issues.push('缺少创建时间');
        rule.createdAt = new Date();
        await exceptionRuleStorage.updateRule(ruleId, { createdAt: rule.createdAt });
        actions.push('已设置创建时间');
        fixed = true;
      }

      if (typeof rule.usageCount !== 'number' || rule.usageCount < 0) {
        issues.push('使用计数无效');
        rule.usageCount = 0;
        await exceptionRuleStorage.updateRule(ruleId, { usageCount: rule.usageCount });
        actions.push('已重置使用计数');
        fixed = true;
      }

      return { fixed, issues, actions };

    } catch {
      return {
        fixed: false,
        issues: ['修复过程中发生错误'],
        actions: ['需要手动检查规则数据']
      };
    }
  }

  /**
   * 建议规则类型转换
   */
  async suggestRuleTypeChange(ruleId: string, desiredAction: RuleActionType): Promise<string> {
    const rule = await exceptionRuleStorage.getRuleById(ruleId);
    
    if (!rule) {
      return '规则不存在，无法提供建议';
    }

    return buildRuleTypeChangeSuggestion(rule, desiredAction);
  }

  /**
   * 获取规则类型统计信息
   */
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

  /**
   * 获取推荐的规则类型（基于用户使用习惯）
   */
  async getRecommendedRuleType(basedOnUsage: boolean = true): Promise<ExceptionRuleType> {
    if (!basedOnUsage) {
      // 默认推荐暂停类型（更常用）
      return ExceptionRuleType.PAUSE_ONLY;
    }
    
    const stats = await this.getRuleTypeStats();
    return getRecommendedRuleTypeFromStats(stats, true);
  }

  /**
   * 搜索规则（支持按名称和类型筛选）
   */
  async searchRules(query: string, type?: ExceptionRuleType): Promise<ExceptionRule[]> {
    let rules: ExceptionRule[];
    
    if (type) {
      rules = await this.getRulesByType(type);
    } else {
      const allRules = await exceptionRuleStorage.getRules();
      rules = allRules.filter(rule => rule.isActive);
    }
    
    if (!query.trim()) {
      return rules;
    }

    return searchRulesInList(rules, query);
  }

  /**
   * 获取规则类型的显示名称
   */
  getRuleTypeDisplayName(type: ExceptionRuleType): string {
    return getRuleTypeDisplayNamePure(type);
  }

  /**
   * 获取操作类型的显示名称
   */
  getActionTypeDisplayName(actionType: RuleActionType): string {
    return getActionTypeDisplayNamePure(actionType);
  }

  /**
   * 检查规则类型是否有效
   */
  isValidRuleType(type: string): type is ExceptionRuleType {
    return isValidRuleTypePure(type);
  }

  /**
   * 检查操作类型是否有效
   */
  isValidActionType(actionType: string): actionType is RuleActionType {
    return isValidActionTypePure(actionType);
  }

  /**
   * 获取规则使用建议
   */
  async getRuleUsageSuggestions(actionType: RuleActionType): Promise<{
    mostUsed: ExceptionRule[];
    recentlyUsed: ExceptionRule[];
    suggested: ExceptionRule[];
  }> {
    const rules = await this.getRulesForAction(actionType);
    return getRuleUsageSuggestionsFromList(rules);
  }
}

// 创建全局实例
export const ruleClassificationService = new RuleClassificationService();
