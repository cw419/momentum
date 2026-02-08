/**
 * 使用统计计算（纯逻辑）
 * - 单规则统计
 * - 整体统计
 * - 时间范围统计
 */

import {
  ExceptionRule,
  OverallUsageStats,
  RuleUsageRecord,
  RuleUsageStats,
} from '../../types';

export function calculateRuleUsageStats(
  rule: ExceptionRule,
  records: RuleUsageRecord[],
): RuleUsageStats {
  const pauseUsage = records.filter((r) => r.actionType === 'pause').length;
  const earlyCompletionUsage = records.filter(
    (r) => r.actionType === 'early_completion',
  ).length;
  const totalUsage = records.length;

  const averageTaskElapsedTime =
    totalUsage > 0
      ? records.reduce((sum, r) => sum + r.taskElapsedTime, 0) / totalUsage
      : 0;

  const chainUsage = new Map<string, { chainName: string; count: number }>();
  for (const record of records) {
    const existing = chainUsage.get(record.chainId);
    if (existing) {
      existing.count++;
    } else {
      chainUsage.set(record.chainId, {
        chainName: record.chainId,
        count: 1,
      });
    }
  }

  const mostUsedWithChains = Array.from(chainUsage.entries())
    .map(([chainId, data]) => ({
      chainId,
      chainName: data.chainName,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    ruleId: rule.id,
    totalUsage,
    pauseUsage,
    earlyCompletionUsage,
    lastUsedAt: rule.lastUsedAt,
    averageTaskElapsedTime,
    mostUsedWithChains,
  };
}

export function calculateOverallUsageStats(
  activeRules: ExceptionRule[],
  allRecords: RuleUsageRecord[],
): OverallUsageStats {
  const totalRules = activeRules.length;
  const totalUsage = allRecords.length;
  const pauseUsage = allRecords.filter((r) => r.actionType === 'pause').length;
  const earlyCompletionUsage = allRecords.filter(
    (r) => r.actionType === 'early_completion',
  ).length;

  const activeRuleById = new Map(activeRules.map((rule) => [rule.id, rule]));
  const ruleUsageCount = new Map<string, { ruleName: string; count: number }>();

  for (const record of allRecords) {
    const rule = activeRuleById.get(record.ruleId);
    if (!rule) continue;

    const existing = ruleUsageCount.get(record.ruleId);
    if (existing) {
      existing.count++;
    } else {
      ruleUsageCount.set(record.ruleId, { ruleName: rule.name, count: 1 });
    }
  }

  const mostUsedRules = Array.from(ruleUsageCount.entries())
    .map(([ruleId, data]) => ({
      ruleId,
      ruleName: data.ruleName,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalRules,
    activeRules: totalRules,
    totalUsage,
    pauseUsage,
    earlyCompletionUsage,
    mostUsedRules,
  };
}

interface UsageStatsInTimeRange {
  totalUsage: number;
  pauseUsage: number;
  earlyCompletionUsage: number;
  dailyUsage: Array<{ date: string; count: number }>;
  topRules: Array<{ ruleId: string; ruleName: string; count: number }>;
}

function toIsoDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function calculateUsageStatsInTimeRange(
  allRecords: RuleUsageRecord[],
  allRules: ExceptionRule[],
  startDate: Date,
  endDate: Date,
): UsageStatsInTimeRange {
  const filteredRecords = allRecords.filter(
    (record) => record.usedAt >= startDate && record.usedAt <= endDate,
  );

  const totalUsage = filteredRecords.length;
  const pauseUsage = filteredRecords.filter(
    (r) => r.actionType === 'pause',
  ).length;
  const earlyCompletionUsage = filteredRecords.filter(
    (r) => r.actionType === 'early_completion',
  ).length;

  const dailyUsageMap = new Map<string, number>();
  for (const record of filteredRecords) {
    const dateKey = toIsoDateKey(record.usedAt);
    dailyUsageMap.set(dateKey, (dailyUsageMap.get(dateKey) || 0) + 1);
  }

  const dailyUsage = Array.from(dailyUsageMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const ruleUsageMap = new Map<string, number>();
  for (const record of filteredRecords) {
    ruleUsageMap.set(record.ruleId, (ruleUsageMap.get(record.ruleId) || 0) + 1);
  }

  const ruleNameById = new Map(allRules.map((r) => [r.id, r.name]));
  const topRules = Array.from(ruleUsageMap.entries())
    .map(([ruleId, count]) => ({
      ruleId,
      ruleName: ruleNameById.get(ruleId) || '未知规则',
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalUsage,
    pauseUsage,
    earlyCompletionUsage,
    dailyUsage,
    topRules,
  };
}
