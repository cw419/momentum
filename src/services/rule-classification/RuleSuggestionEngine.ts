/**
 * 规则建议/统计（纯逻辑）
 * - 类型统计与推荐
 * - 使用建议（最常用/最近使用/综合推荐）
 * - 类型更改建议文案
 */

import { ExceptionRule, ExceptionRuleType } from '../../types';
import { RuleActionType, validateRuleTypeForAction } from './RuleTypeValidator';

export interface RuleTypeStats {
  total: number;
  pauseOnly: number;
  earlyCompletionOnly: number;
  mostUsedType: ExceptionRuleType | null;
  leastUsedType: ExceptionRuleType | null;
}

export interface RuleUsageSuggestions {
  mostUsed: ExceptionRule[];
  recentlyUsed: ExceptionRule[];
  suggested: ExceptionRule[];
}

export function buildRuleTypeChangeSuggestion(rule: ExceptionRule, desiredAction: RuleActionType): string {
  const currentTypeName = rule.type === ExceptionRuleType.PAUSE_ONLY ? '暂停' : '提前完成';
  const desiredTypeName = desiredAction === 'pause' ? '暂停' : '提前完成';

  if (validateRuleTypeForAction(rule, desiredAction)) {
    return '规则类型已经匹配，无需更改';
  }

  return `规则 "${rule.name}" 当前只能用于${currentTypeName}操作。如需用于${desiredTypeName}操作，请创建新规则或修改现有规则类型。`;
}

export function getRuleTypeStatsFromGrouped(grouped: Record<ExceptionRuleType, ExceptionRule[]>): RuleTypeStats {
  const pauseCount = grouped[ExceptionRuleType.PAUSE_ONLY].length;
  const completionCount = grouped[ExceptionRuleType.EARLY_COMPLETION_ONLY].length;
  const total = pauseCount + completionCount;

  let mostUsedType: ExceptionRuleType | null = null;
  let leastUsedType: ExceptionRuleType | null = null;

  if (total > 0) {
    if (pauseCount > completionCount) {
      mostUsedType = ExceptionRuleType.PAUSE_ONLY;
      leastUsedType = ExceptionRuleType.EARLY_COMPLETION_ONLY;
    } else if (completionCount > pauseCount) {
      mostUsedType = ExceptionRuleType.EARLY_COMPLETION_ONLY;
      leastUsedType = ExceptionRuleType.PAUSE_ONLY;
    } else {
      // 数量相等时，比较使用频率
      const pauseUsage = grouped[ExceptionRuleType.PAUSE_ONLY].reduce((sum, rule) => sum + rule.usageCount, 0);
      const completionUsage = grouped[ExceptionRuleType.EARLY_COMPLETION_ONLY].reduce((sum, rule) => sum + rule.usageCount, 0);

      if (pauseUsage > completionUsage) {
        mostUsedType = ExceptionRuleType.PAUSE_ONLY;
        leastUsedType = ExceptionRuleType.EARLY_COMPLETION_ONLY;
      } else if (completionUsage > pauseUsage) {
        mostUsedType = ExceptionRuleType.EARLY_COMPLETION_ONLY;
        leastUsedType = ExceptionRuleType.PAUSE_ONLY;
      }
    }
  }

  return {
    total,
    pauseOnly: pauseCount,
    earlyCompletionOnly: completionCount,
    mostUsedType,
    leastUsedType
  };
}

export function getRecommendedRuleTypeFromStats(stats: RuleTypeStats, basedOnUsage: boolean = true): ExceptionRuleType {
  if (!basedOnUsage) {
    // 默认推荐暂停类型（更常用）
    return ExceptionRuleType.PAUSE_ONLY;
  }

  // 如果有明显的偏好，推荐最常用的类型
  if (stats.mostUsedType) {
    return stats.mostUsedType;
  }

  // 否则推荐暂停类型
  return ExceptionRuleType.PAUSE_ONLY;
}

export function getRuleUsageSuggestionsFromList(rules: ExceptionRule[]): RuleUsageSuggestions {
  // 最常用的规则（按使用次数排序）
  const mostUsed = [...rules]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 3);

  // 最近使用的规则
  const recentlyUsed = [...rules]
    .filter(rule => rule.lastUsedAt)
    .sort((a, b) => (b.lastUsedAt?.getTime() || 0) - (a.lastUsedAt?.getTime() || 0))
    .slice(0, 3);

  // 建议的规则（综合考虑使用频率和最近使用时间）
  const suggested = [...rules]
    .sort((a, b) => {
      const aScore = calculateRuleScore(a);
      const bScore = calculateRuleScore(b);
      return bScore - aScore;
    })
    .slice(0, 5);

  return {
    mostUsed,
    recentlyUsed,
    suggested
  };
}

function calculateRuleScore(rule: ExceptionRule): number {
  let score = 0;

  // 使用频率权重 (40%)
  score += rule.usageCount * 0.4;

  // 最近使用时间权重 (30%)
  if (rule.lastUsedAt) {
    const daysSinceLastUse = (Date.now() - rule.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 30 - daysSinceLastUse) * 0.3;
  }

  // 规则创建时间权重 (20%) - 较新的规则得分稍高
  const daysSinceCreation = (Date.now() - rule.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 365 - daysSinceCreation) / 365 * 20 * 0.2;

  // 规则名称长度权重 (10%) - 较短的名称得分稍高（更简洁）
  const nameLength = rule.name.length;
  score += Math.max(0, 50 - nameLength) / 50 * 10 * 0.1;

  return score;
}
