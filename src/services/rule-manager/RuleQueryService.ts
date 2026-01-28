/**
 * RuleQueryService - 规则查询服务
 * 负责规则的查询、搜索和建议获取逻辑
 */

import {
  ExceptionRule,
  ExceptionRuleType,
  ExceptionRuleError,
  ExceptionRuleException
} from '../../types';
import { exceptionRuleStorage } from '../ExceptionRuleStorage';
import { ruleClassificationService } from '../RuleClassificationService';
import { ruleDuplicationDetector } from '../RuleDuplicationDetector';

export interface DuplicationSuggestions {
  hasExactMatch: boolean;
  exactMatches: ExceptionRule[];
  hasSimilarRules: boolean;
  similarRules: Array<{ rule: ExceptionRule; similarity: number }>;
  suggestion: ExceptionRule | null;
  nameSuggestions: string[];
}

export interface RuleUsageSuggestions {
  mostUsed: ExceptionRule[];
  recentlyUsed: ExceptionRule[];
  suggested: ExceptionRule[];
}

/**
 * 规则查询服务类
 * 单一职责：处理所有规则查询和搜索相关的逻辑
 */
class RuleQueryService {
  /**
   * 获取规则详情
   */
  async getRuleById(id: string): Promise<ExceptionRule | null> {
    try {
      return await exceptionRuleStorage.getRuleById(id);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        'Failed to get rule',
        error
      );
    }
  }

  /**
   * 获取所有规则
   */
  async getAllRules(): Promise<ExceptionRule[]> {
    try {
      return await exceptionRuleStorage.getRules();
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        'Failed to get rule list',
        error
      );
    }
  }

  /**
   * 根据类型获取规则
   */
  async getRulesByType(type: ExceptionRuleType): Promise<ExceptionRule[]> {
    try {
      return await ruleClassificationService.getRulesByType(type);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        'Failed to get rules by type',
        error
      );
    }
  }

  /**
   * 获取适用于指定操作的规则
   */
  async getRulesForAction(actionType: 'pause' | 'early_completion'): Promise<ExceptionRule[]> {
    try {
      return await ruleClassificationService.getRulesForAction(actionType);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        'Failed to get rules for action',
        error
      );
    }
  }

  /**
   * 搜索规则
   */
  async searchRules(
    query: string,
    type?: ExceptionRuleType,
    actionType?: 'pause' | 'early_completion'
  ): Promise<ExceptionRule[]> {
    try {
      let searchType = type;
      if (!searchType && actionType) {
        searchType = actionType === 'pause'
          ? ExceptionRuleType.PAUSE_ONLY
          : ExceptionRuleType.EARLY_COMPLETION_ONLY;
      }

      return await ruleClassificationService.searchRules(query, searchType);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        'Failed to search rules',
        error
      );
    }
  }

  /**
   * 获取规则使用建议
   */
  async getRuleUsageSuggestions(actionType: 'pause' | 'early_completion'): Promise<RuleUsageSuggestions> {
    try {
      return await ruleClassificationService.getRuleUsageSuggestions(actionType);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        'Failed to get usage suggestions',
        error
      );
    }
  }

  /**
   * 获取重复检测建议
   */
  async getDuplicationSuggestions(name: string, excludeId?: string): Promise<DuplicationSuggestions> {
    try {
      const report = await ruleDuplicationDetector.getDuplicationReport(name, excludeId);
      const existingNames = (await this.getAllRules()).map(r => r.name);
      const nameSuggestions = ruleDuplicationDetector.generateNameSuggestions(name, existingNames);

      return {
        ...report,
        nameSuggestions
      };
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        'Failed to get duplication suggestions',
        error
      );
    }
  }
}

export const ruleQueryService = new RuleQueryService();
