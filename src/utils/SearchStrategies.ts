/**
 * 搜索策略模块
 * 提供规则评分、相似度计算和匹配策略
 */

import { ExceptionRule, ExceptionRuleType } from '../types';

export interface SearchResult {
  rule: ExceptionRule;
  score: number;
  matchType: 'exact' | 'prefix' | 'contains' | 'fuzzy';
  highlightRanges: Array<{ start: number; end: number }>;
}

export interface SearchSuggestion {
  text: string;
  type: 'recent' | 'popular' | 'similar';
  score: number;
}

/**
 * 搜索策略接口
 */
export interface ISearchStrategy {
  scoreRule(rule: ExceptionRule, query: string): SearchResult;
  calculateSimilarity(str1: string, str2: string): number;
}

/**
 * 默认搜索策略实现
 */
export class DefaultSearchStrategy implements ISearchStrategy {
  /**
   * 为规则评分
   */
  scoreRule(rule: ExceptionRule, query: string): SearchResult {
    const name = String(rule.name || '').toLowerCase();
    const description = String(rule.description || '').toLowerCase();

    let score = 0;
    let matchType: SearchResult['matchType'] = 'fuzzy';
    const highlightRanges: Array<{ start: number; end: number }> = [];

    if (name === query) {
      score = 1000;
      matchType = 'exact';
      highlightRanges.push({ start: 0, end: rule.name.length });
    } else if (name.startsWith(query)) {
      score = 800;
      matchType = 'prefix';
      highlightRanges.push({ start: 0, end: query.length });
    } else if (name.includes(query)) {
      score = 600;
      matchType = 'contains';
      const index = name.indexOf(query);
      highlightRanges.push({ start: index, end: index + query.length });
    } else if (description.includes(query)) {
      score = 400;
      matchType = 'contains';
    } else {
      const similarity = this.calculateSimilarity(name, query);
      if (similarity > 0.3) {
        score = Math.floor(similarity * 300);
        matchType = 'fuzzy';
      }
    }

    if (score > 0) {
      const usageBonus = Math.min((rule.usageCount || 0) * 10, 200);
      score += usageBonus;

      if (rule.lastUsedAt) {
        const daysSinceLastUse = (Date.now() - rule.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastUse < 7) {
          score += 50;
        }
      }
    }

    return {
      rule,
      score,
      matchType,
      highlightRanges
    };
  }

  /**
   * 计算字符串相似度
   */
  calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 计算编辑距离 (Levenshtein Distance)
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

/**
 * 名称建议生成器
 */
export class NameSuggestionGenerator {
  /**
   * 生成智能规则名称建议
   */
  generateNameSuggestions(partialName: string, actionType: ExceptionRuleType): string[] {
    const suggestions: string[] = [];
    const normalized = partialName.toLowerCase().trim();

    const patterns = this.getCommonPatterns(actionType);

    for (const pattern of patterns) {
      if (pattern.toLowerCase().includes(normalized) ||
          normalized.includes(pattern.toLowerCase())) {
        suggestions.push(pattern);
      }
    }

    const completions = this.getCompletionPatterns(normalized);
    suggestions.push(...completions);

    return [...new Set(suggestions)].slice(0, 3);
  }

  /**
   * 获取常见模式
   */
  private getCommonPatterns(actionType: ExceptionRuleType): string[] {
    const pausePatterns = [
      '上厕所', '喝水', '接电话', '休息', '吃饭', '开会',
      '紧急事务', '家庭事务', '健康问题', '技术故障'
    ];

    const completionPatterns = [
      '任务完成', '提前结束', '目标达成', '紧急情况',
      '优先级变更', '资源不足', '外部依赖', '计划调整'
    ];

    return actionType === ExceptionRuleType.PAUSE_ONLY ? pausePatterns : completionPatterns;
  }

  /**
   * 获取补全模式
   */
  private getCompletionPatterns(partial: string): string[] {
    const patterns: Record<string, string[]> = {
      '上': ['上厕所', '上班', '上课'],
      '喝': ['喝水', '喝茶', '喝咖啡'],
      '接': ['接电话', '接客户', '接孩子'],
      '开': ['开会', '开车', '开发'],
      '紧': ['紧急事务', '紧急电话', '紧急会议'],
      '家': ['家庭事务', '家人电话', '家里有事'],
      '技': ['技术故障', '技术支持', '技术讨论'],
      '任': ['任务完成', '任务调整', '任务优先级'],
      '提': ['提前结束', '提前完成', '提前离开'],
      '目': ['目标达成', '目标调整', '目标变更']
    };

    return patterns[partial] || [];
  }
}

/**
 * 重复检测器
 */
export class DuplicateDetector {
  private strategy: ISearchStrategy;

  constructor(strategy: ISearchStrategy = new DefaultSearchStrategy()) {
    this.strategy = strategy;
  }

  /**
   * 检测重复规则名称
   */
  detectDuplicates(name: string, existingRules: ExceptionRule[]): {
    hasExactMatch: boolean;
    exactMatches: ExceptionRule[];
    similarRules: ExceptionRule[];
  } {
    const normalizedName = name.toLowerCase().trim();
    const exactMatches: ExceptionRule[] = [];
    const similarRules: ExceptionRule[] = [];

    for (const rule of existingRules) {
      const ruleName = String(rule.name || '').toLowerCase();

      if (ruleName === normalizedName) {
        exactMatches.push(rule);
      } else {
        const hasSubstringMatch =
          normalizedName.length >= 2 &&
          (ruleName.includes(normalizedName) || normalizedName.includes(ruleName));

        if (hasSubstringMatch || this.strategy.calculateSimilarity(ruleName, normalizedName) > 0.7) {
          similarRules.push(rule);
        }
      }
    }

    return {
      hasExactMatch: exactMatches.length > 0,
      exactMatches,
      similarRules
    };
  }
}
