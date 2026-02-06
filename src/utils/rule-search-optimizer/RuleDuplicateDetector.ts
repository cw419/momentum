import { ExceptionRuleType } from '../../types';
import type { ExceptionRule } from '../../types';
import { calculateSimilarity } from '../stringUtils';
import { getCommonPatterns, getCompletionPatterns } from './patterns';

export class RuleDuplicateDetector {
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
}

