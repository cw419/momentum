/**
 * 搜索索引模块
 * 提供索引管理、缓存和搜索建议功能
 */

import { ExceptionRule } from '../types';
import { SearchResult, SearchSuggestion, ISearchStrategy } from './SearchStrategies';

/**
 * 拼音转换工具
 */
export class PinyinConverter {
  private static pinyinMap: Record<string, string> = {
    '上': 'shang', '厕': 'ce', '所': 'suo',
    '喝': 'he', '水': 'shui', '茶': 'cha',
    '接': 'jie', '电': 'dian', '话': 'hua',
    '开': 'kai', '会': 'hui', '车': 'che',
    '紧': 'jin', '急': 'ji', '事': 'shi',
    '家': 'jia', '庭': 'ting', '人': 'ren',
    '技': 'ji', '术': 'shu', '故': 'gu', '障': 'zhang',
    '任': 'ren', '务': 'wu', '完': 'wan', '成': 'cheng',
    '提': 'ti', '前': 'qian', '结': 'jie', '束': 'shu',
    '目': 'mu', '标': 'biao', '达': 'da'
  };

  private static firstLetterMap: Record<string, string> = {
    '上': 's', '厕': 'c', '所': 's',
    '喝': 'h', '水': 's', '茶': 'c',
    '接': 'j', '电': 'd', '话': 'h',
    '开': 'k', '会': 'h', '车': 'c',
    '紧': 'j', '急': 'j', '事': 's',
    '家': 'j', '庭': 't', '人': 'r',
    '技': 'j', '术': 's', '故': 'g', '障': 'z',
    '任': 'r', '务': 'w', '完': 'w', '成': 'c',
    '提': 't', '前': 'q', '结': 'j', '束': 's',
    '目': 'm', '标': 'b', '达': 'd'
  };

  static getPinyin(text: string): string {
    return text.split('').map(char => this.pinyinMap[char] || char).join('');
  }

  static getFirstLetters(text: string): string {
    return text.split('').map(char => this.firstLetterMap[char] || char.toLowerCase()).join('');
  }
}

/**
 * 搜索历史管理器
 */
export class SearchHistoryManager {
  private searchHistory: string[] = [];
  private popularSearches: Map<string, number> = new Map();
  private readonly historySize: number;

  constructor(historySize: number = 50) {
    this.historySize = historySize;
  }

  recordSearch(query: string): void {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    this.searchHistory = this.searchHistory.filter(q => q !== trimmedQuery);
    this.searchHistory.unshift(trimmedQuery);

    if (this.searchHistory.length > this.historySize) {
      this.searchHistory = this.searchHistory.slice(0, this.historySize);
    }

    const currentCount = this.popularSearches.get(trimmedQuery) || 0;
    this.popularSearches.set(trimmedQuery, currentCount + 1);
  }

  getHistorySuggestions(): SearchSuggestion[] {
    return this.searchHistory.slice(0, 3).map((query, index) => ({
      text: query,
      type: 'recent' as const,
      score: 100 - index * 10
    }));
  }

  getPopularSuggestions(): SearchSuggestion[] {
    return Array.from(this.popularSearches.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([query, count]) => ({
        text: query,
        type: 'popular' as const,
        score: Math.min(count * 10, 100)
      }));
  }

  getHistorySize(): number {
    return this.searchHistory.length;
  }

  getPopularSearchesStats(): Array<{ query: string; count: number }> {
    return Array.from(this.popularSearches.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}

/**
 * 搜索缓存管理器
 */
export class SearchCacheManager {
  private searchCache: Map<string, SearchResult[]> = new Map();
  private readonly cacheSize: number;

  constructor(cacheSize: number = 100) {
    this.cacheSize = cacheSize;
  }

  get(key: string): SearchResult[] | undefined {
    return this.searchCache.get(key);
  }

  set(key: string, results: SearchResult[]): void {
    if (this.searchCache.size >= this.cacheSize) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey !== undefined) {
        this.searchCache.delete(firstKey);
      }
    }
    this.searchCache.set(key, results);
  }

  clear(): void {
    this.searchCache.clear();
  }

  size(): number {
    return this.searchCache.size;
  }
}

/**
 * 搜索索引管理器
 */
export class SearchIndexManager {
  private searchIndex: Map<string, ExceptionRule[]> = new Map();

  updateIndex(rules: ExceptionRule[]): void {
    this.searchIndex.clear();

    rules.forEach(rule => {
      const keys = [
        String(rule.name || '').toLowerCase(),
        PinyinConverter.getPinyin(String(rule.name || '')),
        PinyinConverter.getFirstLetters(String(rule.name || '')),
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

  getIndex(): Map<string, ExceptionRule[]> {
    return this.searchIndex;
  }

  clear(): void {
    this.searchIndex.clear();
  }
}

/**
 * 搜索建议生成器
 */
export class SuggestionGenerator {
  private historyManager: SearchHistoryManager;
  private strategy: ISearchStrategy;

  constructor(historyManager: SearchHistoryManager, strategy: ISearchStrategy) {
    this.historyManager = historyManager;
    this.strategy = strategy;
  }

  getSearchSuggestions(query: string, rules: ExceptionRule[]): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      suggestions.push(...this.historyManager.getHistorySuggestions());
      suggestions.push(...this.historyManager.getPopularSuggestions());
      return suggestions.slice(0, 5);
    }

    suggestions.push(...this.getSimilarSuggestions(normalizedQuery, rules));
    suggestions.push(...this.getCompletionSuggestions(normalizedQuery, rules));

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  private getSimilarSuggestions(query: string, rules: ExceptionRule[]): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];

    for (const rule of rules) {
      const similarity = this.strategy.calculateSimilarity(String(rule.name || '').toLowerCase(), query);
      if (similarity > 0.5 && similarity < 0.9) {
        suggestions.push({
          text: String(rule.name || ''),
          type: 'similar',
          score: Math.floor(similarity * 100)
        });
      }
    }

    return suggestions.slice(0, 2);
  }

  private getCompletionSuggestions(query: string, rules: ExceptionRule[]): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];

    for (const rule of rules) {
      const name = String(rule.name || '').toLowerCase();
      if (name.startsWith(query) && name !== query) {
        suggestions.push({
          text: String(rule.name || ''),
          type: 'similar',
          score: 80 + (rule.usageCount || 0)
        });
      }
    }

    return suggestions.slice(0, 2);
  }
}
