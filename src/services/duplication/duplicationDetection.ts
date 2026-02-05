/**
 * Duplication detection helpers for Exception Rules.
 *
 * Centralizes the logic previously duplicated between:
 * - RuleDuplicationDetector
 * - EnhancedDuplicationHandler
 *
 * Keep these helpers mostly pure and deterministic so they are easy to unit-test.
 */

import { ExceptionRule } from '../../types';
import { calculateSimilarity, normalizeName } from '../../utils/stringUtils';

type SimilarRuleWithSimilarity = { rule: ExceptionRule; similarity: number };

export type DuplicationReport = {
  hasExactMatch: boolean;
  exactMatches: ExceptionRule[];
  hasSimilarRules: boolean;
  similarRules: SimilarRuleWithSimilarity[];
  suggestion: ExceptionRule | null;
};

export function findExactDuplicateRules(
  rules: ExceptionRule[],
  name: string,
  excludeId?: string
): ExceptionRule[] {
  const normalizedInputName = normalizeName(name);

  return rules.filter(rule =>
    rule.isActive &&
    rule.id !== excludeId &&
    normalizeName(rule.name) === normalizedInputName
  );
}

export function findSimilarRulesWithSimilarity(
  rules: ExceptionRule[],
  name: string,
  threshold: number = 0.8,
  excludeId?: string
): SimilarRuleWithSimilarity[] {
  const normalizedInputName = normalizeName(name);
  const similarRules: SimilarRuleWithSimilarity[] = [];

  for (const rule of rules) {
    if (!rule.isActive) continue;
    if (excludeId && rule.id === excludeId) continue;

    const normalizedRuleName = normalizeName(rule.name);
    const similarity = calculateSimilarity(normalizedInputName, normalizedRuleName);

    if (similarity >= threshold && similarity < 1.0) {
      similarRules.push({ rule, similarity });
    }
  }

  return similarRules.sort((a, b) => b.similarity - a.similarity);
}

export function findSimilarRules(
  rules: ExceptionRule[],
  name: string,
  threshold: number = 0.8
): ExceptionRule[] {
  return findSimilarRulesWithSimilarity(rules, name, threshold).map(item => item.rule);
}

export function suggestExistingRule(rules: ExceptionRule[], name: string): ExceptionRule | null {
  const exactMatches = findExactDuplicateRules(rules, name);
  if (exactMatches.length > 0) return exactMatches[0];

  const similarRules = findSimilarRules(rules, name, 0.75);
  if (similarRules.length > 0) return similarRules[0];

  return null;
}

export function getDuplicationReport(
  rules: ExceptionRule[],
  name: string,
  excludeId?: string
): DuplicationReport {
  const exactMatches = findExactDuplicateRules(rules, name, excludeId);
  const similarRules = findSimilarRulesWithSimilarity(rules, name, 0.7, excludeId);
  const suggestion = suggestExistingRule(rules, name);

  return {
    hasExactMatch: exactMatches.length > 0,
    exactMatches,
    hasSimilarRules: similarRules.length > 0,
    similarRules,
    suggestion,
  };
}

export function batchCheckDuplication(
  rules: ExceptionRule[],
  names: string[]
): Map<string, ExceptionRule[]> {
  const results = new Map<string, ExceptionRule[]>();

  for (const name of names) {
    const duplicates = findExactDuplicateRules(rules, name);
    if (duplicates.length > 0) results.set(name, duplicates);
  }

  return results;
}

export function isCommonRulePattern(name: string): boolean {
  const normalizedInputName = normalizeName(name);
  const commonPatterns = [
    '上厕所', '喝水', '休息', '接电话', '查看消息', '吃东西',
    '伸懒腰', '眼睛休息', '起身活动', '整理桌面', '记录想法'
  ];

  return commonPatterns.some(pattern =>
    normalizeName(pattern) === normalizedInputName ||
    normalizedInputName.includes(normalizeName(pattern))
  );
}

type NameSuggestionOptions = {
  maxSuggestions?: number;
};

export function generateNameSuggestions(
  baseName: string,
  existingNames: string[],
  options: NameSuggestionOptions = {}
): string[] {
  const suggestions: string[] = [];
  const normalizedExisting = existingNames.map(name => normalizeName(name));
  const seen = new Set<string>(normalizedExisting);

  const addSuggestion = (suggestion: string) => {
    const normalized = normalizeName(suggestion);
    if (seen.has(normalized)) return;
    seen.add(normalized);
    suggestions.push(suggestion);
  };

  const numericSuggestions: string[] = [];
  for (let i = 2; i <= 10; i++) {
    const suggestion = `${baseName} ${i}`;
    if (!seen.has(normalizeName(suggestion))) {
      numericSuggestions.push(suggestion);
    }
  }

  const descriptiveSuggestions: string[] = [];
  const suffixes = ['(紧急)', '(短暂)', '(必要)', '(临时)', '(重要)'];
  for (const suffix of suffixes) {
    const suggestion = `${baseName}${suffix}`;
    if (!seen.has(normalizeName(suggestion))) {
      descriptiveSuggestions.push(suggestion);
    }
  }

  const timeSuggestions: string[] = [];
  const timeRelated = ['快速', '5分钟', '短时间', '临时'];
  for (const prefix of timeRelated) {
    const suggestion = `${prefix}${baseName}`;
    if (!seen.has(normalizeName(suggestion))) {
      timeSuggestions.push(suggestion);
    }
  }

  numericSuggestions.slice(0, 2).forEach(addSuggestion);
  descriptiveSuggestions.slice(0, 2).forEach(addSuggestion);
  timeSuggestions.slice(0, 2).forEach(addSuggestion);

  numericSuggestions.slice(2).forEach(addSuggestion);
  descriptiveSuggestions.slice(2).forEach(addSuggestion);
  timeSuggestions.slice(1).forEach(addSuggestion);

  const defaultMax = existingNames.length === 0 ? 5 : 10;
  const maxSuggestions = options.maxSuggestions ?? defaultMax;
  return suggestions.slice(0, maxSuggestions);
}
