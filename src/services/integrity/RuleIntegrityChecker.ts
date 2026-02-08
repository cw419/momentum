/**
 * 规则完整性检查器
 */

import { ExceptionRule, ExceptionRuleType } from '../../types';
import { exceptionRuleStorage } from '../ExceptionRuleStorage';
import type { IntegrityIssue } from './IntegrityTypes';
import { randomId } from '../../utils/random';

class RuleIntegrityChecker {
  validateRuleIds(rules: ExceptionRule[]): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];
    const seenIds = new Set<string>();
    const duplicateIds: string[] = [];

    for (const rule of rules) {
      if (!rule.id) {
        issues.push({
          type: 'missing_id',
          severity: 'critical',
          description: `规则 "${rule.name || 'unnamed'}" 缺少ID`,
          affectedItems: [rule.name || 'unnamed'],
          autoFixable: true,
          fixAction: async () => {
            rule.id = this.generateUniqueId();
            await this.updateRuleInStorage(rule);
          },
          details: { rule },
        });
        continue;
      }

      if (seenIds.has(rule.id)) {
        duplicateIds.push(rule.id);
      } else {
        seenIds.add(rule.id);
      }

      if (!this.isValidId(rule.id)) {
        issues.push({
          type: 'missing_id',
          severity: 'warning',
          description: `规则 "${rule.name}" 的ID格式无效: ${rule.id}`,
          affectedItems: [rule.name],
          autoFixable: true,
          fixAction: async () => {
            const oldId = rule.id;
            rule.id = this.generateUniqueId();
            await this.updateRuleInStorage(rule);
            await this.updateUsageRecordsRuleId(oldId, rule.id);
          },
          details: { rule, oldId: rule.id },
        });
      }
    }

    for (const duplicateId of duplicateIds) {
      const duplicateRules = rules.filter((r) => r.id === duplicateId);
      issues.push({
        type: 'missing_id',
        severity: 'critical',
        description: `发现重复的规则ID: ${duplicateId}`,
        affectedItems: duplicateRules.map((r) => r.name),
        autoFixable: true,
        fixAction: async () => {
          for (let i = 1; i < duplicateRules.length; i++) {
            const rule = duplicateRules[i];
            const oldId = rule.id;
            rule.id = this.generateUniqueId();
            await this.updateRuleInStorage(rule);
            await this.updateUsageRecordsRuleId(oldId, rule.id);
          }
        },
        details: { duplicateId, rules: duplicateRules },
      });
    }

    return issues;
  }

  checkDuplicateNames(rules: ExceptionRule[]): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];
    const nameGroups = new Map<string, ExceptionRule[]>();

    for (const rule of rules.filter((r) => r.isActive)) {
      const normalizedName = rule.name.toLowerCase().trim();
      if (!nameGroups.has(normalizedName)) {
        nameGroups.set(normalizedName, []);
      }
      nameGroups.get(normalizedName)!.push(rule);
    }

    for (const [name, rulesWithSameName] of nameGroups) {
      if (rulesWithSameName.length > 1) {
        issues.push({
          type: 'duplicate_name',
          severity: 'warning',
          description: `发现重复的规则名称: "${rulesWithSameName[0].name}"`,
          affectedItems: rulesWithSameName.map((r) => r.id),
          autoFixable: true,
          fixAction: async () => {
            for (let i = 1; i < rulesWithSameName.length; i++) {
              const rule = rulesWithSameName[i];
              rule.name = `${rule.name} (${i + 1})`;
              await this.updateRuleInStorage(rule);
            }
          },
          details: { originalName: name, rules: rulesWithSameName },
        });
      }
    }

    return issues;
  }

  checkRuleFields(rules: ExceptionRule[]): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];

    for (const rule of rules) {
      if (!rule.name || rule.name.trim().length === 0) {
        issues.push({
          type: 'invalid_type',
          severity: 'critical',
          description: `规则 ID ${rule.id} 缺少名称`,
          affectedItems: [rule.id],
          autoFixable: false,
          details: { rule },
        });
      }

      if (!rule.type) {
        issues.push({
          type: 'invalid_type',
          severity: 'critical',
          description: `规则 "${rule.name}" 缺少类型`,
          affectedItems: [rule.id],
          autoFixable: true,
          fixAction: async () => {
            rule.type = ExceptionRuleType.PAUSE_ONLY;
            await this.updateRuleInStorage(rule);
          },
          details: { rule },
        });
      } else if (!Object.values(ExceptionRuleType).includes(rule.type)) {
        issues.push({
          type: 'invalid_type',
          severity: 'critical',
          description: `规则 "${rule.name}" 的类型无效: ${rule.type}`,
          affectedItems: [rule.id],
          autoFixable: true,
          fixAction: async () => {
            rule.type = ExceptionRuleType.PAUSE_ONLY;
            await this.updateRuleInStorage(rule);
          },
          details: { rule, invalidType: rule.type },
        });
      }

      if (!rule.createdAt) {
        issues.push({
          type: 'missing_created_at',
          severity: 'warning',
          description: `规则 "${rule.name}" 缺少创建时间`,
          affectedItems: [rule.id],
          autoFixable: true,
          fixAction: async () => {
            rule.createdAt = new Date();
            await this.updateRuleInStorage(rule);
          },
          details: { rule },
        });
      }

      if (typeof rule.usageCount !== 'number' || rule.usageCount < 0) {
        issues.push({
          type: 'invalid_usage_count',
          severity: 'warning',
          description: `规则 "${rule.name}" 的使用计数无效: ${rule.usageCount}`,
          affectedItems: [rule.id],
          autoFixable: true,
          fixAction: async () => {
            rule.usageCount = 0;
            await this.updateRuleInStorage(rule);
          },
          details: { rule, invalidCount: rule.usageCount },
        });
      }
    }

    return issues;
  }

  private generateUniqueId(): string {
    return randomId('rule');
  }

  private isValidId(id: string): boolean {
    return typeof id === 'string' && id.length > 0 && !id.includes(' ');
  }

  private async updateRuleInStorage(rule: ExceptionRule): Promise<void> {
    await exceptionRuleStorage.updateRule(rule.id, rule);
  }

  private async updateUsageRecordsRuleId(
    oldId: string,
    newId: string,
  ): Promise<void> {
    const records = await exceptionRuleStorage.getUsageRecords();
    for (const record of records.filter((r) => r.ruleId === oldId)) {
      await exceptionRuleStorage.updateUsageRecord({
        ...record,
        ruleId: newId,
      });
    }
  }
}

export const ruleIntegrityChecker = new RuleIntegrityChecker();
