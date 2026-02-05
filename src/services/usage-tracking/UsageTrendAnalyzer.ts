/**
 * 趋势/效率分析（纯逻辑）
 * - 规则使用趋势
 * - 规则使用效率分析
 */

import { RuleUsageRecord } from '../../types';

interface RuleUsageTrend {
  trend: Array<{ date: string; count: number }>;
  totalUsage: number;
  averageDailyUsage: number;
  peakUsageDate: string | null;
}

function toIsoDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function calculateRuleUsageTrend(
  records: RuleUsageRecord[],
  startDate: Date,
  endDate: Date,
  days: number
): RuleUsageTrend {
  const filteredRecords = records.filter(record => record.usedAt >= startDate && record.usedAt <= endDate);

  const dailyUsageMap = new Map<string, number>();
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = toIsoDateKey(d);
    dailyUsageMap.set(dateKey, 0);
  }

  for (const record of filteredRecords) {
    const dateKey = toIsoDateKey(record.usedAt);
    dailyUsageMap.set(dateKey, (dailyUsageMap.get(dateKey) || 0) + 1);
  }

  const trend = Array.from(dailyUsageMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalUsage = filteredRecords.length;
  const averageDailyUsage = totalUsage / days;

  const peakUsage = Math.max(...trend.map(t => t.count));
  const peakUsageDate = peakUsage > 0
    ? trend.find(t => t.count === peakUsage)?.date || null
    : null;

  return {
    trend,
    totalUsage,
    averageDailyUsage,
    peakUsageDate
  };
}

interface RuleEfficiencyAnalysis {
  averageTaskProgress: number;
  usagePatterns: {
    earlyUsage: number;
    midUsage: number;
    lateUsage: number;
  };
  recommendations: string[];
}

export function calculateRuleEfficiencyAnalysis(records: RuleUsageRecord[]): RuleEfficiencyAnalysis {
  const recordsWithProgress = records.filter(r => r.taskRemainingTime !== undefined);

  if (recordsWithProgress.length === 0) {
    return {
      averageTaskProgress: 0,
      usagePatterns: { earlyUsage: 0, midUsage: 0, lateUsage: 0 },
      recommendations: ['暂无足够数据进行分析']
    };
  }

  const progressData = recordsWithProgress.map(record => {
    const totalTime = record.taskElapsedTime + (record.taskRemainingTime || 0);
    return totalTime > 0 ? record.taskElapsedTime / totalTime : 0;
  });

  const averageTaskProgress = progressData.reduce((sum, p) => sum + p, 0) / progressData.length;

  const earlyUsage = progressData.filter(p => p < 0.25).length;
  const midUsage = progressData.filter(p => p >= 0.25 && p <= 0.75).length;
  const lateUsage = progressData.filter(p => p > 0.75).length;

  const recommendations: string[] = [];

  if (earlyUsage > midUsage + lateUsage) {
    recommendations.push('该规则主要在任务早期使用，可能表示任务规划需要改进');
  }

  if (lateUsage > earlyUsage + midUsage) {
    recommendations.push('该规则主要在任务后期使用，建议检查任务时间估算是否合理');
  }

  if (averageTaskProgress < 0.3) {
    recommendations.push('规则使用时任务进度较低，建议优化任务启动流程');
  }

  if (averageTaskProgress > 0.8) {
    recommendations.push('规则使用时任务接近完成，可能存在时间压力问题');
  }

  if (recommendations.length === 0) {
    recommendations.push('规则使用模式正常，无特殊建议');
  }

  return {
    averageTaskProgress,
    usagePatterns: { earlyUsage, midUsage, lateUsage },
    recommendations
  };
}
