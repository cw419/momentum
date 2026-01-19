/**
 * RuleStatsService - 规则统计服务
 * 负责规则的统计分析逻辑
 */

import {
  ExceptionRuleType,
  RuleUsageStats,
  OverallUsageStats,
  RuleUsageRecord,
  ExceptionRuleError,
  ExceptionRuleException
} from '../../types';
import { ruleUsageTracker } from '../RuleUsageTracker';
import { ruleClassificationService } from '../RuleClassificationService';

export interface RuleTypeStats {
  total: number;
  pauseOnly: number;
  earlyCompletionOnly: number;
  mostUsedType: ExceptionRuleType | null;
  leastUsedType: ExceptionRuleType | null;
}

/**
 * 规则统计服务类
 * 单一职责：处理所有规则统计相关的逻辑
 */
export class RuleStatsService {
  /**
   * 获取规则统计信息
   */
  async getRuleStats(ruleId: string): Promise<RuleUsageStats> {
    try {
      return await ruleUsageTracker.getRuleUsageStats(ruleId);
    } catch (error) {
      if (error instanceof ExceptionRuleException) {
        throw error;
      }
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        'Failed to get rule stats',
        error
      );
    }
  }

  /**
   * 获取整体统计信息
   */
  async getOverallStats(): Promise<OverallUsageStats> {
    try {
      return await ruleUsageTracker.getOverallUsageStats();
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        'Failed to get overall stats',
        error
      );
    }
  }

  /**
   * 获取规则使用历史
   */
  async getRuleUsageHistory(ruleId: string, limit?: number): Promise<RuleUsageRecord[]> {
    try {
      return await ruleUsageTracker.getRuleUsageHistory(ruleId, limit);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        'Failed to get usage history',
        error
      );
    }
  }

  /**
   * 获取规则类型统计
   */
  async getRuleTypeStats(): Promise<RuleTypeStats> {
    try {
      return await ruleClassificationService.getRuleTypeStats();
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        'Failed to get rule type stats',
        error
      );
    }
  }

  /**
   * 获取推荐的规则类型
   */
  async getRecommendedRuleType(basedOnUsage: boolean = true): Promise<ExceptionRuleType> {
    try {
      return await ruleClassificationService.getRecommendedRuleType(basedOnUsage);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        'Failed to get recommended rule type',
        error
      );
    }
  }
}

export const ruleStatsService = new RuleStatsService();
