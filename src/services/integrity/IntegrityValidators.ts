/**
 * 完整性验证器集合
 * 包含各种验证器实现，遵循策略模式
 */

import { ExceptionRule, ExceptionRuleType, RuleUsageRecord } from '../../types';
import { IntegrityIssue, IntegrityValidator, ValidatorContext } from './IntegrityTypes';

/**
 * 规则ID验证器
 */
export class RuleIdValidator implements IntegrityValidator<ExceptionRule[]> {
  validate(rules: ExceptionRule[], context?: ValidatorContext): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];
    const seenIds = new Set<string>();
    const duplicateIds: string[] = [];

    for (const rule of rules) {
      if (!rule.id) {
        issues.push(this.createMissingIdIssue(rule, context));
        continue;
      }

      if (seenIds.has(rule.id)) {
        duplicateIds.push(rule.id);
      } else {
        seenIds.add(rule.id);
      }

      if (!this.isValidId(rule.id)) {
        issues.push(this.createInvalidIdFormatIssue(rule, context));
      }
    }

    issues.push(...this.createDuplicateIdIssues(rules, duplicateIds, context));
    return issues;
  }

  private createMissingIdIssue(rule: ExceptionRule, context?: ValidatorContext): IntegrityIssue {
    return {
      type: 'missing_id',
      severity: 'critical',
      description: `规则 "${rule.name || 'unnamed'}" 缺少ID`,
      affectedItems: [rule.name || 'unnamed'],
      autoFixable: true,
      fixAction: context ? async () => {
        rule.id = context.generateUniqueId();
        await context.updateRule(rule);
      } : undefined,
      details: { rule }
    };
  }

  private createInvalidIdFormatIssue(rule: ExceptionRule, context?: ValidatorContext): IntegrityIssue {
    return {
      type: 'missing_id',
      severity: 'warning',
      description: `规则 "${rule.name}" 的ID格式无效: ${rule.id}`,
      affectedItems: [rule.name],
      autoFixable: true,
      fixAction: context ? async () => {
        const oldId = rule.id;
        rule.id = context.generateUniqueId();
        await context.updateRule(rule);
        await context.updateUsageRecordsRuleId(oldId, rule.id);
      } : undefined,
      details: { rule, oldId: rule.id }
    };
  }

  private createDuplicateIdIssues(
    rules: ExceptionRule[],
    duplicateIds: string[],
    context?: ValidatorContext
  ): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];

    for (const duplicateId of duplicateIds) {
      const duplicateRules = rules.filter(r => r.id === duplicateId);
      issues.push({
        type: 'missing_id',
        severity: 'critical',
        description: `发现重复的规则ID: ${duplicateId}`,
        affectedItems: duplicateRules.map(r => r.name),
        autoFixable: true,
        fixAction: context ? async () => {
          for (let i = 1; i < duplicateRules.length; i++) {
            const rule = duplicateRules[i];
            const oldId = rule.id;
            rule.id = context.generateUniqueId();
            await context.updateRule(rule);
            await context.updateUsageRecordsRuleId(oldId, rule.id);
          }
        } : undefined,
        details: { duplicateId, rules: duplicateRules }
      });
    }

    return issues;
  }

  private isValidId(id: string): boolean {
    return typeof id === 'string' && id.length > 0 && !id.includes(' ');
  }
}

/**
 * 规则名称重复验证器
 */
export class DuplicateNameValidator implements IntegrityValidator<ExceptionRule[]> {
  validate(rules: ExceptionRule[], context?: ValidatorContext): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];
    const nameGroups = new Map<string, ExceptionRule[]>();

    for (const rule of rules.filter(r => r.isActive)) {
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
          affectedItems: rulesWithSameName.map(r => r.id),
          autoFixable: true,
          fixAction: context ? async () => {
            for (let i = 1; i < rulesWithSameName.length; i++) {
              const rule = rulesWithSameName[i];
              rule.name = `${rule.name} (${i + 1})`;
              await context.updateRule(rule);
            }
          } : undefined,
          details: { originalName: name, rules: rulesWithSameName }
        });
      }
    }

    return issues;
  }
}

/**
 * 规则字段验证器
 */
export class RuleFieldValidator implements IntegrityValidator<ExceptionRule[]> {
  validate(rules: ExceptionRule[], context?: ValidatorContext): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];

    for (const rule of rules) {
      issues.push(...this.validateName(rule));
      issues.push(...this.validateType(rule, context));
      issues.push(...this.validateCreatedAt(rule, context));
      issues.push(...this.validateUsageCount(rule, context));
    }

    return issues;
  }

  private validateName(rule: ExceptionRule): IntegrityIssue[] {
    if (!rule.name || rule.name.trim().length === 0) {
      return [{
        type: 'invalid_type',
        severity: 'critical',
        description: `规则 ID ${rule.id} 缺少名称`,
        affectedItems: [rule.id],
        autoFixable: false,
        details: { rule }
      }];
    }
    return [];
  }

  private validateType(rule: ExceptionRule, context?: ValidatorContext): IntegrityIssue[] {
    if (!rule.type) {
      return [{
        type: 'invalid_type',
        severity: 'critical',
        description: `规则 "${rule.name}" 缺少类型`,
        affectedItems: [rule.id],
        autoFixable: true,
        fixAction: context ? async () => {
          rule.type = ExceptionRuleType.PAUSE_ONLY;
          await context.updateRule(rule);
        } : undefined,
        details: { rule }
      }];
    }

    if (!Object.values(ExceptionRuleType).includes(rule.type)) {
      return [{
        type: 'invalid_type',
        severity: 'critical',
        description: `规则 "${rule.name}" 的类型无效: ${rule.type}`,
        affectedItems: [rule.id],
        autoFixable: true,
        fixAction: context ? async () => {
          rule.type = ExceptionRuleType.PAUSE_ONLY;
          await context.updateRule(rule);
        } : undefined,
        details: { rule, invalidType: rule.type }
      }];
    }

    return [];
  }

  private validateCreatedAt(rule: ExceptionRule, context?: ValidatorContext): IntegrityIssue[] {
    if (!rule.createdAt) {
      return [{
        type: 'missing_created_at',
        severity: 'warning',
        description: `规则 "${rule.name}" 缺少创建时间`,
        affectedItems: [rule.id],
        autoFixable: true,
        fixAction: context ? async () => {
          rule.createdAt = new Date();
          await context.updateRule(rule);
        } : undefined,
        details: { rule }
      }];
    }
    return [];
  }

  private validateUsageCount(rule: ExceptionRule, context?: ValidatorContext): IntegrityIssue[] {
    if (typeof rule.usageCount !== 'number' || rule.usageCount < 0) {
      return [{
        type: 'invalid_usage_count',
        severity: 'warning',
        description: `规则 "${rule.name}" 的使用计数无效: ${rule.usageCount}`,
        affectedItems: [rule.id],
        autoFixable: true,
        fixAction: context ? async () => {
          rule.usageCount = 0;
          await context.updateRule(rule);
        } : undefined,
        details: { rule, invalidCount: rule.usageCount }
      }];
    }
    return [];
  }
}

/**
 * 使用记录验证器
 */
export class UsageRecordValidator implements IntegrityValidator<{ records: RuleUsageRecord[]; ruleIds: Set<string> }> {
  validate(
    data: { records: RuleUsageRecord[]; ruleIds: Set<string> },
    context?: ValidatorContext
  ): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];
    const { records, ruleIds } = data;

    for (const record of records) {
      issues.push(...this.validateOrphanedRecord(record, ruleIds, context));
      issues.push(...this.validateUsedAt(record, context));
    }

    return issues;
  }

  private validateOrphanedRecord(
    record: RuleUsageRecord,
    ruleIds: Set<string>,
    context?: ValidatorContext
  ): IntegrityIssue[] {
    if (!ruleIds.has(record.ruleId)) {
      return [{
        type: 'orphaned_record',
        severity: 'warning',
        description: `使用记录引用了不存在的规则ID: ${record.ruleId}`,
        affectedItems: [record.id],
        autoFixable: true,
        fixAction: context ? async () => {
          await context.removeUsageRecord(record.id);
        } : undefined,
        details: { record }
      }];
    }
    return [];
  }

  private validateUsedAt(record: RuleUsageRecord, context?: ValidatorContext): IntegrityIssue[] {
    if (!record.usedAt) {
      return [{
        type: 'missing_created_at',
        severity: 'warning',
        description: `使用记录 ${record.id} 缺少使用时间`,
        affectedItems: [record.id],
        autoFixable: true,
        fixAction: context ? async () => {
          record.usedAt = new Date();
          await context.updateUsageRecord(record);
        } : undefined,
        details: { record }
      }];
    }
    return [];
  }
}
