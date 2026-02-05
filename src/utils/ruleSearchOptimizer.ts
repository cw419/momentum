/**
 * 瑙勫垯鎼滅储浼樺寲鍣?
 * 鎻愪緵鏅鸿兘鎼滅储銆佸缓璁拰鎬ц兘浼樺寲鍔熻兘
 */

import { ExceptionRuleType } from '../types';
import type { ExceptionRule } from '../types';
import { calculateSimilarity } from './stringUtils';
import { getCommonPatterns, getCompletionPatterns } from './rule-search-optimizer/patterns';
import { getFirstLetters, getPinyin } from './rule-search-optimizer/pinyin';
import { getCompletionSuggestions, getSimilarSuggestions } from './rule-search-optimizer/searchSuggestions';
import { applyUsageBonuses, scoreRule } from './rule-search-optimizer/scoring';
import type { SearchResult, SearchSuggestion } from './rule-search-optimizer/types';

export type { SearchResult } from './rule-search-optimizer/types';

export class RuleSearchOptimizer {
  private searchHistory: string[] = [];
  private popularSearches: Map<string, number> = new Map();
  private searchCache: Map<string, SearchResult[]> = new Map();

  private lastIndexedRulesRef: ExceptionRule[] | null = null;
  private indexRevision = 0;

  private indexedRules: ExceptionRule[] = [];
  private indexedRuleNamesLower: string[] = [];
  private indexedRulePinyinLower: string[] = [];
  private indexedRuleFirstLettersLower: string[] = [];

  private prefixIndex: Map<string, Set<number>> = new Map();
  private bigramIndex: Map<string, Set<number>> = new Map();

  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly CACHE_SIZE = 100;
  private readonly HISTORY_SIZE = 50;
  private readonly DEBOUNCE_DELAY = 200;
  private readonly MAX_PREFIX_LEN = 10;

  /**
   * 鏇存柊鎼滅储绱㈠紩
   */
  updateIndex(rules: ExceptionRule[]): void {
    this.lastIndexedRulesRef = rules;
    this.indexRevision += 1;

    this.searchCache.clear(); // index 更新时，必须清缓存避免误命中
    this.prefixIndex.clear();
    this.bigramIndex.clear();

    this.indexedRules = rules;
    this.indexedRuleNamesLower = new Array(rules.length);
    this.indexedRulePinyinLower = new Array(rules.length);
    this.indexedRuleFirstLettersLower = new Array(rules.length);

    rules.forEach((rule, idx) => {
      const nameLower = String(rule.name || '').toLowerCase();
      const pinyinLower = getPinyin(String(rule.name || '')).toLowerCase();
      const firstLettersLower = getFirstLetters(String(rule.name || '')).toLowerCase();

      this.indexedRuleNamesLower[idx] = nameLower;
      this.indexedRulePinyinLower[idx] = pinyinLower;
      this.indexedRuleFirstLettersLower[idx] = firstLettersLower;

      const keys = [nameLower, pinyinLower, firstLettersLower].filter(Boolean);
      for (const key of keys) {
        this.indexKeyPrefixes(key, idx);
        this.indexKeyBigrams(key, idx);
      }
    });
  }

  private indexKeyPrefixes(key: string, ruleIndex: number): void {
    const maxLen = Math.min(this.MAX_PREFIX_LEN, key.length);
    for (let i = 1; i <= maxLen; i++) {
      const prefix = key.slice(0, i);
      let bucket = this.prefixIndex.get(prefix);
      if (!bucket) {
        bucket = new Set<number>();
        this.prefixIndex.set(prefix, bucket);
      }
      bucket.add(ruleIndex);
    }
  }

  private indexKeyBigrams(key: string, ruleIndex: number): void {
    if (key.length < 2) return;
    for (let i = 0; i < key.length - 1; i++) {
      const gram = key.slice(i, i + 2);
      let bucket = this.bigramIndex.get(gram);
      if (!bucket) {
        bucket = new Set<number>();
        this.bigramIndex.set(gram, bucket);
      }
      bucket.add(ruleIndex);
    }
  }

  private ensureIndexUpToDate(rules: ExceptionRule[]): void {
    if (this.lastIndexedRulesRef === rules) return;
    this.updateIndex(rules);
  }

  /**
   * 闃叉姈鎼滅储瑙勫垯
   */
  searchRulesDebounced(rules: ExceptionRule[], query: string, callback: (results: SearchResult[]) => void): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const results = this.searchRules(rules, query);
      callback(results);
    }, this.DEBOUNCE_DELAY);
  }

  private addAll(target: Set<number>, source: Set<number> | undefined): void {
    if (!source) return;
    for (const idx of source) target.add(idx);
  }

  private getBigrams(text: string): string[] {
    if (text.length < 2) return [];
    const grams: string[] = [];
    for (let i = 0; i < text.length - 1; i++) {
      grams.push(text.slice(i, i + 2));
    }
    return grams;
  }

  private intersectBuckets(buckets: Set<number>[]): Set<number> {
    if (buckets.length === 0) return new Set<number>();

    // Start from the smallest set to reduce work.
    const sorted = [...buckets].sort((a, b) => a.size - b.size);
    let intersection = new Set<number>(sorted[0]);

    for (let i = 1; i < sorted.length; i++) {
      const bucket = sorted[i]!;
      const next = new Set<number>();
      for (const idx of intersection) {
        if (bucket.has(idx)) next.add(idx);
      }
      intersection = next;
      if (intersection.size === 0) break;
    }

    return intersection;
  }

  private getCandidateRuleIndexes(normalizedQuery: string): Set<number> {
    const candidates = new Set<number>();

    this.addAll(candidates, this.prefixIndex.get(normalizedQuery));

    const grams = this.getBigrams(normalizedQuery);
    if (grams.length === 0) return candidates;

    const buckets: Set<number>[] = [];
    for (const gram of grams) {
      const bucket = this.bigramIndex.get(gram);
      if (!bucket) return candidates;
      buckets.push(bucket);
    }

    this.addAll(candidates, this.intersectBuckets(buckets));

    return candidates;
  }

  private scoreRuleAtIndex(ruleIndex: number, normalizedQuery: string): SearchResult {
    const rule = this.indexedRules[ruleIndex]!;

    const base = scoreRule(rule, normalizedQuery);
    if (base.score > 0) return base;

    const pinyin = this.indexedRulePinyinLower[ruleIndex] || '';
    const firstLetters = this.indexedRuleFirstLettersLower[ruleIndex] || '';
    const nameLower = this.indexedRuleNamesLower[ruleIndex] || '';

    let baseScore = 0;
    let matchType: SearchResult['matchType'] = 'fuzzy';

    if (pinyin === normalizedQuery || firstLetters === normalizedQuery) {
      baseScore = 700;
      matchType = 'exact';
    } else if (pinyin.startsWith(normalizedQuery) || firstLetters.startsWith(normalizedQuery)) {
      baseScore = 550;
      matchType = 'prefix';
    } else if (pinyin.includes(normalizedQuery) || firstLetters.includes(normalizedQuery)) {
      baseScore = 450;
      matchType = 'contains';
    } else {
      const similarity = Math.max(
        calculateSimilarity(pinyin, normalizedQuery),
        calculateSimilarity(firstLetters, normalizedQuery),
        calculateSimilarity(nameLower, normalizedQuery)
      );
      if (similarity > 0.3) {
        baseScore = Math.floor(similarity * 300);
      }
    }

    if (baseScore <= 0) {
      return { rule, score: 0, matchType: 'fuzzy', highlightRanges: [] };
    }

    return {
      rule,
      score: applyUsageBonuses(rule, baseScore),
      matchType,
      highlightRanges: [],
    };
  }

  /**
   * 鏅鸿兘鎼滅储瑙勫垯
   */
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

    this.ensureIndexUpToDate(rules);

    const cacheKey = `${normalizedQuery}_${this.indexRevision}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached) return cached;

    const results: SearchResult[] = [];

    const candidates = this.getCandidateRuleIndexes(normalizedQuery);
    if (candidates.size > 0) {
      for (const idx of candidates) {
        const searchResult = this.scoreRuleAtIndex(idx, normalizedQuery);
        if (searchResult.score > 0) results.push(searchResult);
      }
    } else {
      for (let idx = 0; idx < this.indexedRules.length; idx++) {
        const searchResult = this.scoreRuleAtIndex(idx, normalizedQuery);
        if (searchResult.score > 0) results.push(searchResult);
      }
    }

    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.rule.usageCount || 0) - (a.rule.usageCount || 0);
    });

    this.cacheSearchResult(cacheKey, results);
    this.recordSearch(query);

    return results;
  }

  /**
   * 鑾峰彇鎼滅储寤鸿
   */
  getSearchSuggestions(query: string, rules: ExceptionRule[]): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      suggestions.push(...this.getHistorySuggestions());
      suggestions.push(...this.getPopularSuggestions());
      return suggestions.slice(0, 5);
    }

    suggestions.push(...getSimilarSuggestions(normalizedQuery, rules));
    suggestions.push(...getCompletionSuggestions(normalizedQuery, rules));

    return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  /**
   * 妫€娴嬮噸澶嶈鍒欏悕绉?
   */
  detectDuplicates(
    name: string,
    existingRules: ExceptionRule[]
  ): { hasExactMatch: boolean; exactMatches: ExceptionRule[]; similarRules: ExceptionRule[] } {
    const normalizedName = name.toLowerCase().trim();
    const exactMatches: ExceptionRule[] = [];
    const similarRules: ExceptionRule[] = [];

    for (const rule of existingRules) {
      const ruleName = String(rule.name || '').toLowerCase();

      if (ruleName === normalizedName) {
        exactMatches.push(rule);
      } else {
        const hasSubstringMatch =
          normalizedName.length >= 2 && (ruleName.includes(normalizedName) || normalizedName.includes(ruleName));

        if (hasSubstringMatch || calculateSimilarity(ruleName, normalizedName) > 0.7) {
          similarRules.push(rule);
        }
      }
    }

    return {
      hasExactMatch: exactMatches.length > 0,
      exactMatches,
      similarRules,
    };
  }

  /**
   * 鐢熸垚鏅鸿兘瑙勫垯鍚嶇О寤鸿
   */
  generateNameSuggestions(partialName: string, actionType: ExceptionRuleType): string[] {
    const suggestions: string[] = [];
    const normalized = partialName.toLowerCase().trim();

    const patterns = getCommonPatterns(actionType);

    for (const pattern of patterns) {
      if (pattern.toLowerCase().includes(normalized) || normalized.includes(pattern.toLowerCase())) {
        suggestions.push(pattern);
      }
    }

    const completions = getCompletionPatterns(normalized);
    suggestions.push(...completions);

    return [...new Set(suggestions)].slice(0, 3);
  }

  /**
   * 娓呯悊鎼滅储缂撳瓨
   */
  clearCache(): void {
    this.searchCache.clear();
  }

  /**
   * 鑾峰彇鎼滅储缁熻
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
        .map(([q, count]) => ({ query: q, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  /**
   * 缂撳瓨鎼滅储缁撴灉
   */
  private cacheSearchResult(key: string, results: SearchResult[]): void {
    if (this.searchCache.size >= this.CACHE_SIZE) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey !== undefined) {
        this.searchCache.delete(firstKey);
      }
    }
    this.searchCache.set(key, results);
  }

  /**
   * 璁板綍鎼滅储鍘嗗彶
   */
  private recordSearch(query: string): void {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    this.searchHistory = this.searchHistory.filter((q) => q !== trimmedQuery);
    this.searchHistory.unshift(trimmedQuery);

    if (this.searchHistory.length > this.HISTORY_SIZE) {
      this.searchHistory = this.searchHistory.slice(0, this.HISTORY_SIZE);
    }

    const currentCount = this.popularSearches.get(trimmedQuery) || 0;
    this.popularSearches.set(trimmedQuery, currentCount + 1);
  }

  /**
   * 鑾峰彇鍘嗗彶鎼滅储寤鸿
   */
  private getHistorySuggestions(): SearchSuggestion[] {
    return this.searchHistory.slice(0, 3).map((q, index) => ({
      text: q,
      type: 'recent' as const,
      score: 100 - index * 10,
    }));
  }

  /**
   * 鑾峰彇鐑棬鎼滅储寤鸿
   */
  private getPopularSuggestions(): SearchSuggestion[] {
    return Array.from(this.popularSearches.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([q, count]) => ({
        text: q,
        type: 'popular' as const,
        score: Math.min(count * 10, 100),
      }));
  }
}

// 瀵煎嚭鍗曚緥瀹炰緥
