import { beforeEach, describe, expect, it } from 'vitest';
import {
  EnhancedExceptionRuleException,
  ExceptionRuleError,
  ExceptionRuleException,
} from '../../../types';
import { errorClassificationService } from '../ErrorClassificationService';

function createError(type: ExceptionRuleError, message: string): ExceptionRuleException {
  return new ExceptionRuleException(type, message);
}

describe('errorClassification/ErrorClassificationService', () => {
  beforeEach(() => {
    errorClassificationService.clearErrorHistory();
  });

  it('analyzes single errors and links related history entries', () => {
    const first = createError(ExceptionRuleError.DUPLICATE_RULE_NAME, 'duplicate alpha');
    const second = createError(ExceptionRuleError.DUPLICATE_RULE_NAME, 'duplicate beta');

    const firstAnalysis = errorClassificationService.analyzeError(first);
    const secondAnalysis = errorClassificationService.analyzeError(second);

    expect(firstAnalysis.relatedErrors).toHaveLength(0);
    expect(secondAnalysis.relatedErrors.length).toBeGreaterThanOrEqual(1);
    expect(secondAnalysis.classification.priority).toBeGreaterThan(0);
    expect(secondAnalysis.recommendations.length).toBeGreaterThan(0);
    expect(secondAnalysis.confidence).toBeGreaterThan(0);
  });

  it('batch-analyzes errors with stable prioritization summary', () => {
    const batch = [
      createError(ExceptionRuleError.DUPLICATE_RULE_NAME, 'dup name'),
      createError(ExceptionRuleError.STORAGE_ERROR, 'storage broken'),
      createError(ExceptionRuleError.RULE_NOT_FOUND, 'rule missing'),
    ];

    const result = errorClassificationService.analyzeErrors(batch);

    expect(result.summary.totalErrors).toBe(3);
    expect(result.summary.criticalErrors).toBe(0);
    expect(result.summary.recoverableErrors).toBe(3);
    expect(result.summary.mostCommonType).toBe(ExceptionRuleError.DUPLICATE_RULE_NAME);
    expect(result.summary.prioritizedErrors[0]?.classification.priority).toBeGreaterThanOrEqual(
      result.summary.prioritizedErrors[1]?.classification.priority ?? 0
    );
  });

  it('creates enhanced errors with classification metadata', () => {
    const enhanced = errorClassificationService.createEnhancedError(
      ExceptionRuleError.RULE_NOT_FOUND,
      'rule not found',
      { id: 'rule-9' }
    );

    expect(enhanced).toBeInstanceOf(EnhancedExceptionRuleException);
    expect(enhanced.type).toBe(ExceptionRuleError.RULE_NOT_FOUND);
    expect(enhanced.context).toEqual({ id: 'rule-9' });
    expect(enhanced.recoverable).toBe(true);
    expect(enhanced.suggestedActions?.length).toBeGreaterThan(0);
    expect(enhanced.userMessage).toBeDefined();
  });

  it('tracks trends/statistics and truncates history to configured max size', () => {
    for (let i = 0; i < 105; i += 1) {
      const type =
        i % 2 === 0 ? ExceptionRuleError.RULE_NOT_FOUND : ExceptionRuleError.STORAGE_ERROR;
      errorClassificationService.analyzeError(createError(type, `error-${i}`));
    }

    const stats = errorClassificationService.getErrorStatistics();
    expect(stats.totalErrors).toBe(100);
    expect((stats.errorsByType.get(ExceptionRuleError.RULE_NOT_FOUND) ?? 0) + (stats.errorsByType.get(ExceptionRuleError.STORAGE_ERROR) ?? 0)).toBe(100);
    expect([...stats.errorsBySeverity.values()].reduce((acc, n) => acc + n, 0)).toBe(100);
    expect([...stats.errorsByCategory.values()].reduce((acc, n) => acc + n, 0)).toBe(100);

    const trends = errorClassificationService.getErrorTrends();
    expect(trends.recentErrors).toHaveLength(20);
    expect([...trends.errorFrequency.values()].reduce((acc, n) => acc + n, 0)).toBe(100);
    expect([...trends.severityDistribution.values()].reduce((acc, n) => acc + n, 0)).toBe(100);
    expect(trends.timeDistribution.get(new Date().getHours().toString())).toBe(100);
  });

  it('supports direct classify and clear history operations', () => {
    const error = createError(ExceptionRuleError.NETWORK_ERROR, 'network timeout');

    const classification = errorClassificationService.classifyError(error);
    expect(classification).toEqual(
      expect.objectContaining({
        category: 'network_error',
      })
    );

    errorClassificationService.analyzeError(error);
    expect(errorClassificationService.getErrorStatistics().totalErrors).toBe(1);

    errorClassificationService.clearErrorHistory();
    expect(errorClassificationService.getErrorStatistics().totalErrors).toBe(0);
  });
});
