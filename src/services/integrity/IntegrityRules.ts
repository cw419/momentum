/**
 * 完整性规则定义
 * 包含数据一致性检查规则，遵循策略模式
 */

import { ExceptionRule, RuleUsageRecord } from '../../types';
import { IntegrityIssue, IntegrityRule, ValidatorContext } from './IntegrityTypes';

/**
 * 使用计数一致性规则
 * 检查规则的使用计数与实际使用记录是否一致
 */
export class UsageCountConsistencyRule implements IntegrityRule<ExceptionRule[], RuleUsageRecord[]> {
  private context?: ValidatorContext;

  setContext(context: ValidatorContext): void {
    this.context = context;
  }

  async check(rules: ExceptionRule[], records?: RuleUsageRecord[]): Promise<IntegrityIssue[]> {
    if (!records) return [];

    const issues: IntegrityIssue[] = [];
    const usageCountMap = this.buildUsageCountMap(records);

    for (const rule of rules) {
      const actualCount = usageCountMap.get(rule.id) || 0;
      if (rule.usageCount !== actualCount) {
        issues.push(this.createInconsistencyIssue(rule, actualCount));
      }
    }

    return issues;
  }

  private buildUsageCountMap(records: RuleUsageRecord[]): Map<string, number> {
    const usageCountMap = new Map<string, number>();
    for (const record of records) {
      const count = usageCountMap.get(record.ruleId) || 0;
      usageCountMap.set(record.ruleId, count + 1);
    }
    return usageCountMap;
  }

  private createInconsistencyIssue(rule: ExceptionRule, actualCount: number): IntegrityIssue {
    return {
      type: 'invalid_usage_count',
      severity: 'info',
      description: `规则 "${rule.name}" 的使用计数不一致，记录显示 ${actualCount}，但规则显示 ${rule.usageCount}`,
      affectedItems: [rule.id],
      autoFixable: true,
      fixAction: this.context ? async () => {
        rule.usageCount = actualCount;
        await this.context!.updateRule(rule);
      } : undefined,
      details: { rule, actualCount, recordedCount: rule.usageCount }
    };
  }
}

/**
 * 报告生成器
 * 生成摘要和建议
 */
export class IntegrityReportGenerator {
  generateSummary(issues: IntegrityIssue[]): {
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
    infoIssues: number;
    autoFixableIssues: number;
  } {
    const summary = {
      totalIssues: issues.length,
      criticalIssues: 0,
      warningIssues: 0,
      infoIssues: 0,
      autoFixableIssues: 0
    };

    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          summary.criticalIssues++;
          break;
        case 'warning':
          summary.warningIssues++;
          break;
        case 'info':
          summary.infoIssues++;
          break;
      }

      if (issue.autoFixable) {
        summary.autoFixableIssues++;
      }
    }

    return summary;
  }

  generateRecommendations(issues: IntegrityIssue[]): string[] {
    const recommendations: string[] = [];

    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(`发现 ${criticalIssues.length} 个严重问题，建议立即修复`);
    }

    const autoFixableIssues = issues.filter(i => i.autoFixable);
    if (autoFixableIssues.length > 0) {
      recommendations.push(`有 ${autoFixableIssues.length} 个问题可以自动修复`);
    }

    const duplicateNames = issues.filter(i => i.type === 'duplicate_name');
    if (duplicateNames.length > 0) {
      recommendations.push('建议为重复的规则名称添加区分标识');
    }

    const orphanedRecords = issues.filter(i => i.type === 'orphaned_record');
    if (orphanedRecords.length > 0) {
      recommendations.push('建议清理孤立的使用记录');
    }

    if (issues.length === 0) {
      recommendations.push('数据完整性良好，无需修复');
    }

    return recommendations;
  }
}
