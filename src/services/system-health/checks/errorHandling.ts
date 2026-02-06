import { errorClassificationService } from '../../ErrorClassificationService';
import { statusFromScore } from '../scoring';
import type { ComponentHealth } from '../types';

export async function checkErrorHandling(): Promise<ComponentHealth> {
  try {
    const errorStats = errorClassificationService.getErrorStatistics();
    const errorTrends = errorClassificationService.getErrorTrends();

    const issues: string[] = [];
    let score = 100;

    if (errorStats.totalErrors > 100) {
      issues.push(`错误数量过多: ${errorStats.totalErrors}`);
      score -= 20;
    }

    const criticalErrors = errorStats.errorsBySeverity.get('critical') || 0;
    if (criticalErrors > 0) {
      issues.push(`${criticalErrors} 个严重错误`);
      score -= criticalErrors * 15;
    }

    score = Math.max(0, score);

    return {
      name: '错误处理',
      status: statusFromScore(score),
      score,
      issues,
      metrics: {
        totalErrors: errorStats.totalErrors,
        criticalErrors,
        recentErrors: errorTrends.recentErrors.length,
      },
    };
  } catch {
    return {
      name: '错误处理',
      status: 'critical',
      score: 0,
      issues: ['错误处理检查失败'],
    };
  }
}

