import type { ExceptionRule } from '../../types';
import { calculateSimilarity } from '../stringUtils';
import type { SearchResult } from '../ruleSearchOptimizer';

export function scoreRule(rule: ExceptionRule, query: string): SearchResult {
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
    const similarity = calculateSimilarity(name, query);
    if (similarity > 0.3) {
      score = Math.floor(similarity * 300);
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

