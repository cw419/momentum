import { useEffect, useMemo, useState } from 'react';
import type { ExceptionRule } from '../../types';
import {
  RuleSearchOptimizer,
  type SearchResult,
} from '../../utils/ruleSearchOptimizer';

export function useRuleSearchResults(rules: ExceptionRule[], query: string) {
  const optimizer = useMemo(() => new RuleSearchOptimizer(), []);
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (!rules.length) {
      setResults([]);
    } else if (query.trim()) {
      optimizer.searchRulesDebounced(rules, query, setResults);
    } else {
      setResults(
        [...rules]
          .sort(
            (left, right) => (right.usageCount ?? 0) - (left.usageCount ?? 0),
          )
          .map((rule) => ({
            rule,
            score: rule.usageCount ?? 0,
            matchType: 'exact' as const,
            highlightRanges: [],
          })),
      );
    }
  }, [optimizer, query, rules]);

  return {
    results,
    detectDuplicates: (name: string) => optimizer.detectDuplicates(name, rules),
  };
}
