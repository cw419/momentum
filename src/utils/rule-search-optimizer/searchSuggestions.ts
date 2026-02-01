import type { ExceptionRule } from '../../types';
import { calculateSimilarity } from '../stringUtils';
import type { SearchSuggestion } from '../ruleSearchOptimizer';

export function getSimilarSuggestions(query: string, rules: ExceptionRule[]): SearchSuggestion[] {
  const suggestions: SearchSuggestion[] = [];

  for (const rule of rules) {
    const similarity = calculateSimilarity(String(rule.name || '').toLowerCase(), query);
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

export function getCompletionSuggestions(query: string, rules: ExceptionRule[]): SearchSuggestion[] {
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

