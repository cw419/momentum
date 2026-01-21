/**
 * DuplicationDetector - 重复规则检测器
 * 负责检测规则名称的完全匹配和相似匹配
 */

import {
  ExceptionRule,
  ExceptionRuleError,
  ExceptionRuleException
} from '../../types';
import { exceptionRuleStorage } from '../ExceptionRuleStorage';
import { getCurrentLanguage, tr } from '../../utils/runtimeI18n';

export interface DuplicationCheckResult {
  hasConflict: boolean;
  conflictType: 'exact' | 'similar' | 'none';
  existingRules: ExceptionRule[];
  canProceed: boolean;
}

export interface NameSuggestionConfig {
  maxSuggestions: number;
  numericSuffixStart: number;
  numericSuffixEnd: number;
}

const DEFAULT_CONFIG: NameSuggestionConfig = {
  maxSuggestions: 3,
  numericSuffixStart: 2,
  numericSuffixEnd: 5
};

/**
 * 重复检测器类
 * 提供规则名称的重复检测和相似度计算功能
 */
export class DuplicationDetector {
  private checkCache = new Map<string, { result: DuplicationCheckResult; timestamp: number }>();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2分钟缓存
  private readonly SIMILARITY_THRESHOLD = 0.7;

  /**
   * 检查规则名称重复
   */
  async checkDuplication(name: string, excludeId?: string): Promise<DuplicationCheckResult> {
    const cacheKey = `${name}_${excludeId || 'new'}`;

    const cached = this.checkCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    try {
      const allRules = await exceptionRuleStorage.getRules();
      const activeRules = allRules.filter(rule =>
        rule.isActive && (!excludeId || rule.id !== excludeId)
      );

      const exactMatches = this.findExactMatches(activeRules, name);
      const similarMatches = this.findSimilarMatches(activeRules, name);

      let conflictType: 'exact' | 'similar' | 'none' = 'none';
      let existingRules: ExceptionRule[] = [];

      if (exactMatches.length > 0) {
        conflictType = 'exact';
        existingRules = exactMatches;
      } else if (similarMatches.length > 0) {
        conflictType = 'similar';
        existingRules = similarMatches;
      }

      const result: DuplicationCheckResult = {
        hasConflict: conflictType !== 'none',
        conflictType,
        existingRules,
        canProceed: conflictType !== 'exact'
      };

      this.checkCache.set(cacheKey, { result, timestamp: Date.now() });

      return result;

    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        tr('重复检查失败', 'Duplicate check failed'),
        error
      );
    }
  }

  /**
   * 查找完全匹配的规则
   */
  private findExactMatches(rules: ExceptionRule[], name: string): ExceptionRule[] {
    return rules.filter(rule =>
      rule.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * 查找相似匹配的规则
   */
  private findSimilarMatches(rules: ExceptionRule[], name: string): ExceptionRule[] {
    return rules.filter(rule =>
      rule.name.toLowerCase() !== name.toLowerCase() &&
      this.calculateSimilarity(rule.name, name) > this.SIMILARITY_THRESHOLD
    );
  }

  /**
   * 计算字符串相似度（基于编辑距离）
   */
  calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1;

    const matrix: number[][] = [];
    const len1 = s1.length;
    const len2 = s2.length;

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }

    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : 1 - (matrix[len1][len2] / (maxLen + 1));
  }

  /**
   * 生成智能的名称建议
   */
  generateNameSuggestions(
    baseName: string,
    existingNames: string[],
    config: NameSuggestionConfig = DEFAULT_CONFIG
  ): string[] {
    const suggestions: string[] = [];

    for (let i = config.numericSuffixStart; i <= config.numericSuffixEnd; i++) {
      const suggestion = `${baseName} ${i}`;
      if (!existingNames.some(name => name.toLowerCase() === suggestion.toLowerCase())) {
        suggestions.push(suggestion);
      }
    }

    const language = getCurrentLanguage();
    const descriptiveSuffixes = language === 'zh'
      ? ['新', '备用', '临时', '特殊']
      : ['New', 'Spare', 'Temp', 'Special'];
    for (const suffix of descriptiveSuffixes) {
      const suggestion = `${baseName}(${suffix})`;
      if (!existingNames.some(name => name.toLowerCase() === suggestion.toLowerCase())) {
        suggestions.push(suggestion);
      }
    }

    const timestamp = new Date().toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '');
    const timestampSuggestion = `${baseName}_${timestamp}`;
    if (!existingNames.some(name => name.toLowerCase() === timestampSuggestion.toLowerCase())) {
      suggestions.push(timestampSuggestion);
    }

    return suggestions.slice(0, config.maxSuggestions);
  }

  /**
   * 获取冲突消息
   */
  getConflictMessage(result: DuplicationCheckResult): string {
    if (result.conflictType === 'exact') {
      return tr(
        `规则名称 "${result.existingRules[0].name}" 已存在`,
        `Rule name "${result.existingRules[0].name}" already exists`
      );
    } else if (result.conflictType === 'similar') {
      const similarNames = result.existingRules.map(r => r.name).join('", "');
      return tr(
        `发现相似的规则名称: "${similarNames}"`,
        `Found similar rule name(s): "${similarNames}"`
      );
    }
    return tr('没有发现冲突', 'No conflict detected');
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.checkCache.clear();
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.checkCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.checkCache.delete(key);
      }
    }
  }
}

export const duplicationDetector = new DuplicationDetector();
