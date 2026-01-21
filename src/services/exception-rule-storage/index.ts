/**
 * 例外规则存储模块
 * 门面类 - 整合所有子模块并提供统一 API
 */

import { ExceptionRule, RuleUsageRecord, ExceptionRuleStorage } from '../../types';
import { RulePersistence, rulePersistence } from './RulePersistence';
import { RuleValidator, ruleValidator, ExceptionRuleCreateInput } from './RuleValidator';
import { RuleRepository } from './RuleRepository';
import { UsageRecordRepository } from './UsageRecordRepository';
import { logger } from '../../utils/logger';
import { toError } from '../../utils/errorMessage';

export type { ExceptionRuleCreateInput } from './RuleValidator';
export { RulePersistence, RuleValidator, RuleRepository, UsageRecordRepository };

export class ExceptionRuleStorageService {
  private readonly ruleRepo: RuleRepository;
  private readonly usageRepo: UsageRecordRepository;

  constructor(
    persistence: RulePersistence = rulePersistence,
    validator: RuleValidator = ruleValidator
  ) {
    this.ruleRepo = new RuleRepository(persistence, validator);
    this.usageRepo = new UsageRecordRepository(persistence);
  }

  getRules(): Promise<ExceptionRule[]> {
    return this.ruleRepo.getRules();
  }

  getRuleById(id: string): Promise<ExceptionRule | null> {
    return this.ruleRepo.getRuleById(id);
  }

  getRulesByType(type: ExceptionRule['type']): Promise<ExceptionRule[]> {
    return this.ruleRepo.getRulesByType(type);
  }

  createRule(rule: ExceptionRuleCreateInput): Promise<ExceptionRule> {
    return this.ruleRepo.createRule(rule);
  }

  updateRule(id: string, updates: Partial<ExceptionRule>): Promise<ExceptionRule> {
    return this.ruleRepo.updateRule(id, updates);
  }

  deleteRule(id: string): Promise<void> {
    return this.ruleRepo.deleteRule(id);
  }

  validateRule(rule: Partial<ExceptionRule>, isCreating: boolean = false): void {
    ruleValidator.validateRule(rule, isCreating);
  }

  getAllUsageRecords(): Promise<RuleUsageRecord[]> {
    return this.usageRepo.getUsageRecords();
  }

  getUsageRecords(): Promise<RuleUsageRecord[]> {
    return this.usageRepo.getUsageRecords();
  }

  getUsageRecordsByChain(chainId: string): Promise<RuleUsageRecord[]> {
    return this.usageRepo.getUsageRecordsByChain(chainId);
  }

  getUsageRecordsByRuleId(ruleId: string, limit?: number): Promise<RuleUsageRecord[]> {
    return this.usageRepo.getUsageRecordsByRuleId(ruleId, limit);
  }

  getUsageRecordsBySessionId(sessionId: string): Promise<RuleUsageRecord[]> {
    return this.usageRepo.getUsageRecordsBySessionId(sessionId);
  }

  async createUsageRecord(
    record: Omit<RuleUsageRecord, 'id' | 'usedAt'>
  ): Promise<RuleUsageRecord> {
    const newRecord = await this.usageRepo.createUsageRecord(record);
    await this.ruleRepo.updateRuleUsageStats(record.ruleId);
    return newRecord;
  }

  updateUsageRecord(updatedRecord: RuleUsageRecord): Promise<void> {
    return this.usageRepo.updateUsageRecord(updatedRecord);
  }

  deleteUsageRecord(recordId: string): Promise<void> {
    return this.usageRepo.deleteUsageRecord(recordId);
  }

  async cleanupExpiredData(): Promise<void> {
    try {
      const records = await this.usageRepo.getUsageRecords();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const validRecords = records.filter(record => record.usedAt > thirtyDaysAgo);

      if (validRecords.length !== records.length) {
        this.usageRepo.saveUsageRecords(validRecords);
      }
    } catch (error) {
      logger.warn('EXCEPTION_RULE_STORAGE', '清理过期数据失败', undefined, toError(error));
    }
  }

  async exportData(): Promise<ExceptionRuleStorage> {
    const rules = await this.ruleRepo.getRules();
    const usageRecords = await this.usageRepo.getUsageRecords();

    return {
      rules: rules.filter(rule => rule.isActive),
      usageRecords,
      lastSyncAt: new Date()
    };
  }

  async importData(
    data: ExceptionRuleStorage,
    mergeStrategy: 'replace' | 'merge' = 'merge'
  ): Promise<void> {
    if (mergeStrategy === 'replace') {
      this.ruleRepo.saveRules(data.rules);
      this.usageRepo.saveUsageRecords(data.usageRecords);
    } else {
      const existingRules = await this.ruleRepo.getRules();
      const existingRecords = await this.usageRepo.getUsageRecords();

      const mergedRules = [...existingRules];
      for (const newRule of data.rules) {
        if (!mergedRules.some(r => r.name === newRule.name && r.isActive)) {
          mergedRules.push({ ...newRule, id: rulePersistence.generateId() });
        }
      }

      const mergedRecords = [
        ...existingRecords,
        ...data.usageRecords.map(r => ({ ...r, id: rulePersistence.generateId() }))
      ];

      this.ruleRepo.saveRules(mergedRules);
      this.usageRepo.saveUsageRecords(mergedRecords);
    }
  }
}

export const exceptionRuleStorage = new ExceptionRuleStorageService();
