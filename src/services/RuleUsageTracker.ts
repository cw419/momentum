/**
 * 规则使用统计跟踪器
 * 记录和分析例外规则的使用情况
 */

import { 
  RuleUsageRecord, 
  SessionContext, 
  RuleUsageStats, 
  OverallUsageStats,
  PauseOptions,
  ExceptionRuleError,
  ExceptionRuleException
} from '../types';
import { exceptionRuleStorage } from './ExceptionRuleStorage';
import { logger } from '../utils/logger';
import { isDev } from '../utils/env';
import {
  RuleUsageActionType,
  buildUsageExportData,
  buildUsageRecordInput,
  calculateOverallUsageStats,
  calculateRuleEfficiencyAnalysis,
  calculateRuleUsageStats,
  calculateRuleUsageTrend,
  calculateUsageStatsInTimeRange,
  countExpiredUsageRecords,
  formatUsageRecordsAsCsv
} from './usage-tracking';

export class RuleUsageTracker {
  /**
   * 记录规则使用
   */
  async recordUsage(
    ruleId: string, 
    sessionContext: SessionContext, 
    actionType: RuleUsageActionType,
    pauseOptions?: PauseOptions
  ): Promise<RuleUsageRecord> {
    try {
      // 验证规则是否存在
      const rule = await exceptionRuleStorage.getRuleById(ruleId);
      if (!rule || !rule.isActive) {
        throw new ExceptionRuleException(
          ExceptionRuleError.RULE_NOT_FOUND,
          `规则 ID ${ruleId} 不存在或已被删除`
        );
      }

      // 创建使用记录
      const record = await exceptionRuleStorage.createUsageRecord(
        buildUsageRecordInput(rule, sessionContext, actionType, pauseOptions)
      );

      return record;
    } catch (error) {
      if (error instanceof ExceptionRuleException) {
        throw error;
      }
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '记录规则使用失败',
        error
      );
    }
  }

  /**
   * 获取规则使用统计
   */
  async getRuleUsageStats(ruleId: string): Promise<RuleUsageStats> {
    try {
      const rule = await exceptionRuleStorage.getRuleById(ruleId);
      if (!rule) {
        throw new ExceptionRuleException(
          ExceptionRuleError.RULE_NOT_FOUND,
          `规则 ID ${ruleId} 不存在`
        );
      }

      const records = await exceptionRuleStorage.getUsageRecordsByRuleId(ruleId);

      return calculateRuleUsageStats(rule, records);
    } catch (error) {
      if (error instanceof ExceptionRuleException) {
        throw error;
      }
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取规则使用统计失败',
        error
      );
    }
  }

  /**
   * 获取整体使用统计
   */
  async getOverallUsageStats(): Promise<OverallUsageStats> {
    try {
      const allRules = await exceptionRuleStorage.getRules();
      const activeRules = allRules.filter(rule => rule.isActive);
      const allRecords = await exceptionRuleStorage.getUsageRecords();

      return calculateOverallUsageStats(activeRules, allRecords);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取整体使用统计失败',
        error
      );
    }
  }

  /**
   * 获取规则使用历史
   */
  async getRuleUsageHistory(ruleId: string, limit?: number): Promise<RuleUsageRecord[]> {
    try {
      return await exceptionRuleStorage.getUsageRecordsByRuleId(ruleId, limit);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取规则使用历史失败',
        error
      );
    }
  }

  /**
   * 获取会话使用历史
   */
  async getSessionUsageHistory(sessionId: string): Promise<RuleUsageRecord[]> {
    try {
      return await exceptionRuleStorage.getUsageRecordsBySessionId(sessionId);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取会话使用历史失败',
        error
      );
    }
  }

  /**
   * 获取时间范围内的使用统计
   */
  async getUsageStatsInTimeRange(
    startDate: Date, 
    endDate: Date
  ): Promise<{
    totalUsage: number;
    pauseUsage: number;
    earlyCompletionUsage: number;
    dailyUsage: Array<{ date: string; count: number }>;
    topRules: Array<{ ruleId: string; ruleName: string; count: number }>;
  }> {
    try {
      const allRecords = await exceptionRuleStorage.getUsageRecords();
      const allRules = await exceptionRuleStorage.getRules();
      return calculateUsageStatsInTimeRange(allRecords, allRules, startDate, endDate);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取时间范围使用统计失败',
        error
      );
    }
  }

  /**
   * 获取规则使用趋势
   */
  async getRuleUsageTrend(ruleId: string, days: number = 30): Promise<{
    trend: Array<{ date: string; count: number }>;
    totalUsage: number;
    averageDailyUsage: number;
    peakUsageDate: string | null;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const records = await exceptionRuleStorage.getUsageRecordsByRuleId(ruleId);
      return calculateRuleUsageTrend(records, startDate, endDate, days);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取规则使用趋势失败',
        error
      );
    }
  }

  /**
   * 获取规则效率分析
   */
  async getRuleEfficiencyAnalysis(ruleId: string): Promise<{
    averageTaskProgress: number; // 平均任务进度（已用时间/总时间）
    usagePatterns: {
      earlyUsage: number; // 任务早期使用次数（<25%进度）
      midUsage: number;   // 任务中期使用次数（25%-75%进度）
      lateUsage: number;  // 任务后期使用次数（>75%进度）
    };
    recommendations: string[];
  }> {
    try {
      const records = await exceptionRuleStorage.getUsageRecordsByRuleId(ruleId);

      return calculateRuleEfficiencyAnalysis(records);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取规则效率分析失败',
        error
      );
    }
  }

  /**
   * 清理过期的使用记录
   */
  async cleanupExpiredRecords(retentionDays: number = 90): Promise<number> {
    try {
      const allRecords = await exceptionRuleStorage.getUsageRecords();
      const removedCount = countExpiredUsageRecords(allRecords, retentionDays);

      if (removedCount > 0) {
        // 这里需要实现保存过滤后记录的方法
        // 由于当前存储服务没有直接的批量更新方法，这里先返回计数
      }

      if (removedCount > 0 && isDev) {
        logger.debug('RULE_USAGE', '将清理过期记录', { removedCount, retentionDays });
      }

      return removedCount;
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '清理过期记录失败',
        error
      );
    }
  }

  /**
   * 导出使用统计数据
   */
  async exportUsageData(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const overallStats = await this.getOverallUsageStats();
      const allRules = await exceptionRuleStorage.getRules();
      const allRecords = await exceptionRuleStorage.getUsageRecords();

      const exportData = {
        ...buildUsageExportData(overallStats, allRules.filter(r => r.isActive), allRecords)
      };

      if (format === 'json') {
        return JSON.stringify(exportData, null, 2);
      } else {
        return formatUsageRecordsAsCsv(allRecords, allRules);
      }
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '导出使用数据失败',
        error
      );
    }
  }
}

// 创建全局实例
export const ruleUsageTracker = new RuleUsageTracker();
