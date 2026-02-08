import { dataIntegrityChecker } from '../../DataIntegrityChecker';
import { statusFromScore } from '../scoring';
import type { ComponentHealth } from '../types';

export async function checkDataIntegrity(): Promise<ComponentHealth> {
  try {
    const report = await dataIntegrityChecker.checkRuleDataIntegrity();
    const issues: string[] = [];
    let score = 100;

    if (report.summary.criticalIssues > 0) {
      issues.push(`${report.summary.criticalIssues} 个严重问题`);
      score -= report.summary.criticalIssues * 20;
    }

    if (report.summary.warningIssues > 0) {
      issues.push(`${report.summary.warningIssues} 个警告问题`);
      score -= report.summary.warningIssues * 5;
    }

    score = Math.max(0, score);

    return {
      name: '数据完整性',
      status: statusFromScore(score),
      score,
      issues,
      metrics: {
        totalIssues: report.summary.totalIssues,
        criticalIssues: report.summary.criticalIssues,
        autoFixableIssues: report.summary.autoFixableIssues,
      },
    };
  } catch {
    return {
      name: '数据完整性',
      status: 'critical',
      score: 0,
      issues: ['数据完整性检查失败'],
    };
  }
}
