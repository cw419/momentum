import type { SearchResult, SearchSuggestion } from './types';

export class RuleSearchCache {
  private searchHistory: string[] = [];
  private popularSearches: Map<string, number> = new Map();
  private searchCache: Map<string, SearchResult[]> = new Map();

  private readonly CACHE_SIZE = 100;
  private readonly HISTORY_SIZE = 50;

  clearCache(): void {
    this.searchCache.clear();
  }

  getCachedSearchResults(key: string): SearchResult[] | undefined {
    return this.searchCache.get(key);
  }

  cacheSearchResult(key: string, results: SearchResult[]): void {
    if (this.searchCache.size >= this.CACHE_SIZE) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey !== undefined) {
        this.searchCache.delete(firstKey);
      }
    }
    this.searchCache.set(key, results);
  }

  recordSearch(query: string): void {
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

  getHistorySuggestions(): SearchSuggestion[] {
    return this.searchHistory.slice(0, 3).map((q, index) => ({
      text: q,
      type: 'recent' as const,
      score: 100 - index * 10,
    }));
  }

  getPopularSuggestions(): SearchSuggestion[] {
    return Array.from(this.popularSearches.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([q, count]) => ({
        text: q,
        type: 'popular' as const,
        score: Math.min(count * 10, 100),
      }));
  }

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
}
