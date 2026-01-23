/**
 * 规则重复检测服务
 * 检测重复规则名称和提供相似规则建议
 */

import { ExceptionRule } from '../types';
import { exceptionRuleStorage } from './ExceptionRuleStorage';
import { calculateSimilarity, normalizeName } from '../utils/stringUtils';

export class RuleDuplicationDetector {
  /**
   * 检测精确重复的规则名称
   */
  async checkDuplication(name: string, excludeId?: string): Promise<ExceptionRule[]> {
    const rules = await exceptionRuleStorage.getRules();
    const normalizedInputName = normalizeName(name);

    return rules.filter(rule =>
      rule.isActive &&
      rule.id !== excludeId &&
      normalizeName(rule.name) === normalizedInputName
    );
  }

  /**
   * 查找相似的规则名称
   */
  async findSimilarRules(name: string, threshold: number = 0.8): Promise<ExceptionRule[]> {
    const rules = await exceptionRuleStorage.getRules();
    const normalizedInputName = normalizeName(name);

    const similarRules: Array<{ rule: ExceptionRule; similarity: number }> = [];

    for (const rule of rules) {
      if (!rule.isActive) continue;

      const normalizedRuleName = normalizeName(rule.name);
      const similarity = calculateSimilarity(normalizedInputName, normalizedRuleName);

      if (similarity >= threshold && similarity < 1.0) {
        similarRules.push({ rule, similarity });
      }
    }

    return similarRules
      .sort((a, b) => b.similarity - a.similarity)
      .map(item => item.rule);
  }

  /**
   * 建议使用现有规则
   */
  async suggestExistingRule(name: string): Promise<ExceptionRule | null> {
    // 首先检查精确匹配
    const exactMatches = await this.checkDuplication(name);
    if (exactMatches.length > 0) {
      return exactMatches[0];
    }
    
    // 然后查找高相似度的规则
    const similarRules = await this.findSimilarRules(name, 0.75);
    if (similarRules.length > 0) {
      return similarRules[0];
    }
    
    return null;
  }

  /**
   * 获取重复检测报告
   */
  async getDuplicationReport(name: string, excludeId?: string): Promise<{
    hasExactMatch: boolean;
    exactMatches: ExceptionRule[];
    hasSimilarRules: boolean;
    similarRules: Array<{ rule: ExceptionRule; similarity: number }>;
    suggestion: ExceptionRule | null;
  }> {
    const exactMatches = await this.checkDuplication(name, excludeId);
    const similarRulesData = await this.findSimilarRulesWithSimilarity(name, 0.7);
    const suggestion = await this.suggestExistingRule(name);
    
    return {
      hasExactMatch: exactMatches.length > 0,
      exactMatches,
      hasSimilarRules: similarRulesData.length > 0,
      similarRules: similarRulesData,
      suggestion
    };
  }

  /**
   * 批量检测重复规则
   */
  async batchCheckDuplication(names: string[]): Promise<Map<string, ExceptionRule[]>> {
    const results = new Map<string, ExceptionRule[]>();
    
    for (const name of names) {
      const duplicates = await this.checkDuplication(name);
      if (duplicates.length > 0) {
        results.set(name, duplicates);
      }
    }
    
    return results;
  }

  /**
   * 查找相似规则并返回相似度
   */
  private async findSimilarRulesWithSimilarity(name: string, threshold: number = 0.8): Promise<Array<{ rule: ExceptionRule; similarity: number }>> {
    const rules = await exceptionRuleStorage.getRules();
    const normalizedInputName = normalizeName(name);

    const similarRules: Array<{ rule: ExceptionRule; similarity: number }> = [];

    for (const rule of rules) {
      if (!rule.isActive) continue;

      const normalizedRuleName = normalizeName(rule.name);
      const similarity = calculateSimilarity(normalizedInputName, normalizedRuleName);

      if (similarity >= threshold && similarity < 1.0) {
        similarRules.push({ rule, similarity });
      }
    }

    return similarRules.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 检查是否为常见的规则模式
   */
  isCommonPattern(name: string): boolean {
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

  /**
   * 生成规则名称建议
   */
  generateNameSuggestions(baseName: string, existingNames: string[]): string[] {
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

    const maxSuggestions = existingNames.length === 0 ? 5 : 10;
    return suggestions.slice(0, maxSuggestions);
  }
}

// 创建全局实例
export const ruleDuplicationDetector = new RuleDuplicationDetector();
