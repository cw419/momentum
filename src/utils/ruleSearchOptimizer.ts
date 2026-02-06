/**
 * 鐟欏嫬鍨幖婊呭偍娴兼ê瀵查崳?
 * 閹绘劒绶甸弲楦垮厴閹兼粎鍌ㄩ妴浣哥紦鐠侇喖鎷伴幀褑鍏樻导妯哄閸旂喕鍏?
 */

import { ExceptionRuleType } from '../types';
import type { ExceptionRule } from '../types';
import {
  getCompletionSuggestions,
  getSimilarSuggestions,
  RuleDuplicateDetector,
  RuleSearchCache,
  RuleSearchIndex,
  type SearchResult,
  type SearchSuggestion,
} from './rule-search-optimizer';

export type { SearchResult } from './rule-search-optimizer';

export class RuleSearchOptimizer {
  private readonly index = new RuleSearchIndex();
  private readonly cache = new RuleSearchCache();
  private readonly duplicates = new RuleDuplicateDetector();

  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_DELAY = 200;

  updateIndex(rules: ExceptionRule[]): void {
    this.cache.clearCache(); // index 鏇存柊鏃讹紝蹇呴』娓呯紦瀛橀伩鍏嶈鍛戒腑
    this.index.updateIndex(rules);
  }

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

  searchRules(rules: ExceptionRule[], query: string): SearchResult[] {
    if (!query.trim()) {
      return rules
        .map((rule) => ({
          rule,
          score: rule.usageCount || 0,
          matchType: 'exact' as const,
          highlightRanges: [],
        }))
        .sort((a, b) => b.score - a.score);
    }

    const normalizedQuery = query.toLowerCase().trim();

    if (this.index.ensureIndexUpToDate(rules)) {
      this.cache.clearCache();
    }

    const cacheKey = `${normalizedQuery}_${this.index.getIndexRevision()}`;
    const cached = this.cache.getCachedSearchResults(cacheKey);
    if (cached) return cached;

    const results = this.index.search(normalizedQuery);

    this.cache.cacheSearchResult(cacheKey, results);
    this.cache.recordSearch(query);

    return results;
  }

  getSearchSuggestions(query: string, rules: ExceptionRule[]): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      suggestions.push(...this.cache.getHistorySuggestions());
      suggestions.push(...this.cache.getPopularSuggestions());
      return suggestions.slice(0, 5);
    }

    suggestions.push(...getSimilarSuggestions(normalizedQuery, rules));
    suggestions.push(...getCompletionSuggestions(normalizedQuery, rules));

    return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  detectDuplicates(
    name: string,
    existingRules: ExceptionRule[]
  ): { hasExactMatch: boolean; exactMatches: ExceptionRule[]; similarRules: ExceptionRule[] } {
    return this.duplicates.detectDuplicates(name, existingRules);
  }

  generateNameSuggestions(partialName: string, actionType: ExceptionRuleType): string[] {
    return this.duplicates.generateNameSuggestions(partialName, actionType);
  }

  clearCache(): void {
    this.cache.clearCache();
  }

  getSearchStats(): {
    cacheSize: number;
    historySize: number;
    popularSearches: Array<{ query: string; count: number }>;
  } {
    return this.cache.getSearchStats();
  }
}

