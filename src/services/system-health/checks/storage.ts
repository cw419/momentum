import { exceptionRuleStorage } from '../../ExceptionRuleStorage';
import { statusFromScore } from '../scoring';
import type { ComponentHealth } from '../types';

export async function checkStorage(): Promise<ComponentHealth> {
  try {
    const rules = await exceptionRuleStorage.getRules();
    const usageRecords = await exceptionRuleStorage.getUsageRecords();

    const issues: string[] = [];
    let score = 100;

    if (rules.length === 0) {
      issues.push('没有规则数据');
      score -= 30;
    }

    const activeRules = rules.filter((r) => r.isActive);
    const activeRatio = activeRules.length / rules.length;
    if (activeRatio < 0.5) {
      issues.push('活跃规则比例过低');
      score -= 20;
    }

    score = Math.max(0, score);

    return {
      name: '存储系统',
      status: statusFromScore(score),
      score,
      issues,
      metrics: {
        totalRules: rules.length,
        activeRules: activeRules.length,
        usageRecords: usageRecords.length,
        activeRatio: Math.round(activeRatio * 100),
      },
    };
  } catch {
    return {
      name: '存储系统',
      status: 'critical',
      score: 0,
      issues: ['存储系统检查失败'],
    };
  }
}
