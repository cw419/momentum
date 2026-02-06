import { ruleStateManager } from '../../RuleStateManager';
import { statusFromScore } from '../scoring';
import type { ComponentHealth } from '../types';

export async function checkRuleStates(): Promise<ComponentHealth> {
  try {
    const states = ruleStateManager.getAllStates();
    const issues: string[] = [];
    let score = 100;

    if (states.pendingCreations.size > 10) {
      issues.push(`过多待处理创建: ${states.pendingCreations.size}`);
      score -= 20;
    }

    const errorStates = Array.from(states.states.values()).filter((s) => s.status === 'error');
    if (errorStates.length > 0) {
      issues.push(`${errorStates.length} 个规则处于错误状态`);
      score -= errorStates.length * 10;
    }

    score = Math.max(0, score);

    return {
      name: '规则状态管理',
      status: statusFromScore(score),
      score,
      issues,
      metrics: {
        totalStates: states.states.size,
        pendingCreations: states.pendingCreations.size,
        idMappings: states.idMappings.size,
        errorStates: errorStates.length,
      },
    };
  } catch {
    return {
      name: '规则状态管理',
      status: 'critical',
      score: 0,
      issues: ['规则状态检查失败'],
    };
  }
}

