/**
 * 使用记录完整性检查器
 */

import { ExceptionRule, RuleUsageRecord } from '../../types';
import { exceptionRuleStorage } from '../ExceptionRuleStorage';
import type { IntegrityIssue } from './types';

export class UsageRecordIntegrityChecker {
  checkUsageRecordsIntegrity(
    records: RuleUsageRecord[],
    rules: ExceptionRule[]
  ): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];
    const ruleIds = new Set(rules.map(r => r.id));

    for (const record of records) {
      if (!ruleIds.has(record.ruleId)) {
        issues.push({
          type: 'orphaned_record',
          severity: 'warning',
          description: `使用记录引用了不存在的规则ID: ${record.ruleId}`,
          affectedItems: [record.id],
          autoFixable: true,
          fixAction: async () => {
            await exceptionRuleStorage.deleteUsageRecord(record.id);
          },
          details: { record }
        });
      }

      if (!record.usedAt) {
        issues.push({
          type: 'missing_created_at',
          severity: 'warning',
          description: `使用记录 ${record.id} 缺少使用时间`,
          affectedItems: [record.id],
          autoFixable: true,
          fixAction: async () => {
            record.usedAt = new Date();
            await exceptionRuleStorage.updateUsageRecord(record);
          },
          details: { record }
        });
      }
    }

    return issues;
  }

  checkDataConsistency(
    rules: ExceptionRule[],
    records: RuleUsageRecord[]
  ): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];

    const usageCountMap = new Map<string, number>();
    for (const record of records) {
      const count = usageCountMap.get(record.ruleId) || 0;
      usageCountMap.set(record.ruleId, count + 1);
    }

    for (const rule of rules) {
      const actualCount = usageCountMap.get(rule.id) || 0;
      if (rule.usageCount !== actualCount) {
        issues.push({
          type: 'invalid_usage_count',
          severity: 'info',
          description: `规则 "${rule.name}" 的使用计数不一致，记录显示 ${actualCount}，但规则显示 ${rule.usageCount}`,
          affectedItems: [rule.id],
          autoFixable: true,
          fixAction: async () => {
            rule.usageCount = actualCount;
            await exceptionRuleStorage.updateRule(rule.id, { usageCount: actualCount });
          },
          details: { rule, actualCount, recordedCount: rule.usageCount }
        });
      }
    }

    return issues;
  }
}

export const usageRecordIntegrityChecker = new UsageRecordIntegrityChecker();
