/**
 * 规则搜索优化器
 * 提供智能搜索、建议和性能优化功能
 */

import { ExceptionRule, ExceptionRuleType } from '../types';
import { calculateSimilarity } from './stringUtils';
import { getCommonPatterns, getCompletionPatterns } from './rule-search-optimizer/patterns';
import { getFirstLetters, getPinyin } from './rule-search-optimizer/pinyin';
import { getCompletionSuggestions, getSimilarSuggestions } from './rule-search-optimizer/searchSuggestions';
import { scoreRule } from './rule-search-optimizer/scoring';

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

export class RuleSearchOptimizer {
  private searchHistory: string[] = [];
  private popularSearches: Map<string, number> = new Map();
  private searchCache: Map<string, SearchResult[]> = new Map();
  private searchIndex: Map<string, ExceptionRule[]> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly CACHE_SIZE = 100;
  private readonly HISTORY_SIZE = 50;
  private readonly DEBOUNCE_DELAY = 200;

  /**
   * 更新搜索索引
   */
  updateIndex(rules: ExceptionRule[]): void {
    this.searchIndex.clear();
    this.searchCache.clear(); // 清除缓存以确保数据一致性
    
    rules.forEach(rule => {
      const keys = [
        String(rule.name || '').toLowerCase(),
        getPinyin(String(rule.name || '')),
        getFirstLetters(String(rule.name || '')),
        ...(rule.description ? [String(rule.description).toLowerCase()] : [])
      ];
      
      keys.forEach(key => {
        if (!this.searchIndex.has(key)) {
          this.searchIndex.set(key, []);
        }
        this.searchIndex.get(key)!.push(rule);
      });
    });
  }

  /**
   * 防抖搜索规则
   */
  searchRulesDebounced(
    rules: ExceptionRule[], 
    query: string, 
    callback: (results: SearchResult[]) => void
  ): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      const results = this.searchRules(rules, query);
      callback(results);
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * 智能搜索规则
   */
  searchRules(rules: ExceptionRule[], query: string): SearchResult[] {
    if (!query.trim()) {
      return rules.map(rule => ({
        rule,
        score: rule.usageCount || 0,
        matchType: 'exact' as const,
        highlightRanges: []
      })).sort((a, b) => b.score - a.score);
    }

    const normalizedQuery = query.toLowerCase().trim();
    
    // 检查缓存
    const cacheKey = `${normalizedQuery}_${rules.length}`;
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    const results: SearchResult[] = [];

    for (const rule of rules) {
      const searchResult = scoreRule(rule, normalizedQuery);
      if (searchResult.score > 0) {
        results.push(searchResult);
      }
    }

    // 按分数排序
    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 分数相同时，按使用频率排序
      return (b.rule.usageCount || 0) - (a.rule.usageCount || 0);
    });

    // 缓存结果
    this.cacheSearchResult(cacheKey, results);

    // 记录搜索历史
    this.recordSearch(query);

    return results;
  }

  /**
   * 获取搜索建议
   */
  getSearchSuggestions(query: string, rules: ExceptionRule[]): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      // 没有查询时，返回历史和热门搜索
      suggestions.push(...this.getHistorySuggestions());
      suggestions.push(...this.getPopularSuggestions());
      return suggestions.slice(0, 5);
    }

    // 基于当前查询的建议
    suggestions.push(...getSimilarSuggestions(normalizedQuery, rules));
    suggestions.push(...getCompletionSuggestions(normalizedQuery, rules));

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
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
      // 确保rule.name是字符串
      const ruleName = String(rule.name || '').toLowerCase();
      
      if (ruleName === normalizedName) {
        exactMatches.push(rule);
      } else {
        const hasSubstringMatch =
          normalizedName.length >= 2 &&
          (ruleName.includes(normalizedName) || normalizedName.includes(ruleName));

        if (hasSubstringMatch || calculateSimilarity(ruleName, normalizedName) > 0.7) {
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

  /**
   * 生成智能规则名称建议
   */
  generateNameSuggestions(partialName: string, actionType: ExceptionRuleType): string[] {
    const suggestions: string[] = [];
    const normalized = partialName.toLowerCase().trim();

    // 基于动作类型的常见模式
    const patterns = getCommonPatterns(actionType);
    
    for (const pattern of patterns) {
      if (pattern.toLowerCase().includes(normalized) || 
          normalized.includes(pattern.toLowerCase())) {
        suggestions.push(pattern);
      }
    }

    // 基于部分输入的补全建议
    const completions = getCompletionPatterns(normalized);
    suggestions.push(...completions);

    return [...new Set(suggestions)].slice(0, 3);
  }

  /**
   * 清理搜索缓存
   */
  clearCache(): void {
    this.searchCache.clear();
  }

  /**
   * 获取搜索统计
   */
  getSearchStats(): {
    cacheSize: number;
    historySize: number;
    popularSearches: Array<{ query: string; count: number }>;
  } {
    return {
      cacheSize: this.searchCache.size,
      historySize: this.searchHistory.length,
      popularSearches: Array.from(this.popularSearches.entries())
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }

  /**
   * 缓存搜索结果
   */
  private cacheSearchResult(key: string, results: SearchResult[]): void {
    if (this.searchCache.size >= this.CACHE_SIZE) {
      // 删除最旧的缓存项
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey !== undefined) {
        this.searchCache.delete(firstKey);
      }
    }
    this.searchCache.set(key, results);
  }

  /**
   * 记录搜索历史
   */
  private recordSearch(query: string): void {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    // 更新搜索历史
    this.searchHistory = this.searchHistory.filter(q => q !== trimmedQuery);
    this.searchHistory.unshift(trimmedQuery);
    
    if (this.searchHistory.length > this.HISTORY_SIZE) {
      this.searchHistory = this.searchHistory.slice(0, this.HISTORY_SIZE);
    }

    // 更新热门搜索
    const currentCount = this.popularSearches.get(trimmedQuery) || 0;
    this.popularSearches.set(trimmedQuery, currentCount + 1);
  }

  /**
   * 获取历史搜索建议
   */
  private getHistorySuggestions(): SearchSuggestion[] {
    return this.searchHistory.slice(0, 3).map((query, index) => ({
      text: query,
      type: 'recent' as const,
      score: 100 - index * 10
    }));
  }

  /**
   * 获取热门搜索建议
   */
  private getPopularSuggestions(): SearchSuggestion[] {
    return Array.from(this.popularSearches.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([query, count]) => ({
        text: query,
        type: 'popular' as const,
        score: Math.min(count * 10, 100)
      }));
  }
}

// 导出单例实例
