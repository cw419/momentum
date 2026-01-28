/**
 * 完整性报告生成器
 */

import type { IntegrityIssue, IntegrityReport } from './IntegrityTypes';

class IntegrityReportGenerator {
  generateSummary(issues: IntegrityIssue[]): IntegrityReport['summary'] {
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

  generateReport(issues: IntegrityIssue[]): IntegrityReport {
    return {
      issues,
      summary: this.generateSummary(issues),
      recommendations: this.generateRecommendations(issues)
    };
  }
}

export const integrityReportGenerator = new IntegrityReportGenerator();
