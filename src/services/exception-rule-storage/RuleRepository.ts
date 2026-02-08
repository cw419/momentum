/**
 * 规则仓储模块
 * 负责规则的 CRUD 操作
 */

import {
  ExceptionRule,
  ExceptionRuleError,
  ExceptionRuleException,
  ExceptionRuleType,
} from '../../types';
import { RulePersistence } from './RulePersistence';
import { RuleValidator, ExceptionRuleCreateInput } from './RuleValidator';

/**
 * 规则仓储服务
 */
export class RuleRepository {
  constructor(
    private persistence: RulePersistence,
    private validator: RuleValidator,
  ) {}

  private getRuleIndexOrThrow(rules: ExceptionRule[], id: string): number {
    const ruleIndex = rules.findIndex((rule) => rule.id === id);
    if (ruleIndex === -1) {
      throw new ExceptionRuleException(
        ExceptionRuleError.RULE_NOT_FOUND,
        `规则 ID ${id} 不存在`,
      );
    }
    return ruleIndex;
  }

  /**
   * 获取所有例外规则
   */
  async getRules(): Promise<ExceptionRule[]> {
    try {
      return this.persistence.loadRules();
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取例外规则失败',
        error,
      );
    }
  }

  /**
   * 根据ID获取例外规则
   */
  async getRuleById(id: string): Promise<ExceptionRule | null> {
    const rules = await this.getRules();
    return rules.find((rule) => rule.id === id) || null;
  }

  /**
   * 根据类型获取例外规则
   */
  async getRulesByType(type: ExceptionRuleType): Promise<ExceptionRule[]> {
    const rules = await this.getRules();
    return rules.filter((rule) => rule.type === type && rule.isActive);
  }

  /**
   * 创建新的例外规则
   */
  async createRule(rule: ExceptionRuleCreateInput): Promise<ExceptionRule> {
    try {
      const normalizedRule = this.validator.normalizeRuleInput(rule);
      this.validator.validateRule(normalizedRule, true);

      const existingRules = await this.getRules();

      if (this.validator.checkDuplicateName(existingRules, normalizedRule)) {
        const scopeText = normalizedRule.scope === 'chain' ? '此链中' : '全局';
        throw new ExceptionRuleException(
          ExceptionRuleError.DUPLICATE_RULE_NAME,
          `规则名称 "${normalizedRule.name}" 在${scopeText}已存在`,
        );
      }

      const newRule: ExceptionRule = {
        ...normalizedRule,
        id: this.persistence.generateId(),
        createdAt: new Date(),
        usageCount: 0,
        isActive: true,
      };

      const rules = [...existingRules, newRule];
      this.persistence.saveRules(rules);

      return newRule;
    } catch (error) {
      if (error instanceof ExceptionRuleException) {
        throw error;
      }
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '创建例外规则失败',
        error,
      );
    }
  }

  /**
   * 更新例外规则
   */
  async updateRule(
    id: string,
    updates: Partial<ExceptionRule>,
  ): Promise<ExceptionRule> {
    try {
      const rules = await this.getRules();
      const ruleIndex = this.getRuleIndexOrThrow(rules, id);

      const updatedName = updates.name;
      if (
        updatedName &&
        updatedName !== rules[ruleIndex].name &&
        rules.some((r) => r.name === updatedName && r.id !== id && r.isActive)
      ) {
        throw new ExceptionRuleException(
          ExceptionRuleError.DUPLICATE_RULE_NAME,
          `规则名称 "${updatedName}" 已存在`,
        );
      }

      const updatedRule = { ...rules[ruleIndex], ...updates };
      rules[ruleIndex] = updatedRule;

      this.persistence.saveRules(rules);
      return updatedRule;
    } catch (error) {
      if (error instanceof ExceptionRuleException) {
        throw error;
      }
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '更新例外规则失败',
        error,
      );
    }
  }

  /**
   * 删除例外规则（软删除）
   */
  async deleteRule(id: string): Promise<void> {
    try {
      const rules = await this.getRules();
      const ruleIndex = this.getRuleIndexOrThrow(rules, id);

      rules[ruleIndex].isActive = false;
      this.persistence.saveRules(rules);
    } catch (error) {
      if (error instanceof ExceptionRuleException) {
        throw error;
      }
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '删除例外规则失败',
        error,
      );
    }
  }

  /**
   * 更新规则使用统计
   */
  async updateRuleUsageStats(ruleId: string): Promise<void> {
    const rules = await this.getRules();
    const ruleIndex = rules.findIndex((rule) => rule.id === ruleId);

    if (ruleIndex !== -1) {
      rules[ruleIndex].usageCount += 1;
      rules[ruleIndex].lastUsedAt = new Date();
      this.persistence.saveRules(rules);
    }
  }

  /**
   * 保存规则列表（用于批量操作）
   */
  saveRules(rules: ExceptionRule[]): void {
    this.persistence.saveRules(rules);
  }
}
