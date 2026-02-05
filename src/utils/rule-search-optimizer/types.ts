import type { ExceptionRule } from '../../types';

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

