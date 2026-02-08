/**
 * 使用记录构建与导出（偏纯逻辑）
 * - 构建 createUsageRecord 入参
 * - 导出 JSON/CSV 格式
 * - 计算过期记录数量（不做持久化）
 */

import {
  ExceptionRule,
  OverallUsageStats,
  PauseOptions,
  RuleUsageRecord,
  SessionContext,
} from '../../types';

export type RuleUsageActionType = 'pause' | 'early_completion';

export function buildUsageRecordInput(
  rule: ExceptionRule,
  sessionContext: SessionContext,
  actionType: RuleUsageActionType,
  pauseOptions?: PauseOptions,
): Omit<RuleUsageRecord, 'id' | 'usedAt'> {
  return {
    ruleId: rule.id,
    chainId: sessionContext.chainId,
    sessionId: sessionContext.sessionId,
    actionType,
    taskElapsedTime: sessionContext.elapsedTime,
    taskRemainingTime: sessionContext.remainingTime,
    pauseDuration: pauseOptions?.duration,
    autoResume: pauseOptions?.autoResume,
    ruleScope: rule.scope,
  };
}

interface UsageExportData {
  exportedAt: string;
  overallStats: OverallUsageStats;
  rules: ExceptionRule[];
  usageRecords: RuleUsageRecord[];
  summary: {
    totalRules: number;
    totalRecords: number;
    dateRange: {
      earliest: number | null;
      latest: number | null;
    };
  };
}

export function buildUsageExportData(
  overallStats: OverallUsageStats,
  activeRules: ExceptionRule[],
  usageRecords: RuleUsageRecord[],
  exportedAt: Date = new Date(),
): UsageExportData {
  return {
    exportedAt: exportedAt.toISOString(),
    overallStats,
    rules: activeRules,
    usageRecords,
    summary: {
      totalRules: activeRules.length,
      totalRecords: usageRecords.length,
      dateRange: {
        earliest:
          usageRecords.length > 0
            ? Math.min(...usageRecords.map((r) => r.usedAt.getTime()))
            : null,
        latest:
          usageRecords.length > 0
            ? Math.max(...usageRecords.map((r) => r.usedAt.getTime()))
            : null,
      },
    },
  };
}

export function formatUsageRecordsAsCsv(
  usageRecords: RuleUsageRecord[],
  allRules: ExceptionRule[],
): string {
  const csvLines = [
    'Date,Rule Name,Action Type,Task Elapsed Time,Task Remaining Time,Chain ID',
    ...usageRecords.map((record) => {
      const rule = allRules.find((r) => r.id === record.ruleId);
      return [
        record.usedAt.toISOString(),
        rule?.name || 'Unknown',
        record.actionType,
        record.taskElapsedTime,
        record.taskRemainingTime || '',
        record.chainId,
      ].join(',');
    }),
  ];

  return csvLines.join('\n');
}

export function countExpiredUsageRecords(
  usageRecords: RuleUsageRecord[],
  retentionDays: number,
  now: Date = new Date(),
): number {
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const validRecords = usageRecords.filter(
    (record) => record.usedAt > cutoffDate,
  );
  return usageRecords.length - validRecords.length;
}
