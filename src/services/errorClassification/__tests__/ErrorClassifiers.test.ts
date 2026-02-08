import { describe, expect, it } from 'vitest';
import { ExceptionRuleError, ExceptionRuleException } from '../../../types';
import {
  calculateConfidence,
  DefaultErrorClassifier,
  generateRecommendations,
  generateUserFriendlyMessage,
} from '../ErrorClassifiers';
import type { ErrorClassification, ErrorPattern } from '../types';

function createError(
  type: ExceptionRuleError,
  message: string,
): ExceptionRuleException {
  return new ExceptionRuleException(type, message);
}

describe('errorClassification/ErrorClassifiers', () => {
  it('classifies known patterns and unknown types with fallback rules', () => {
    const classifier = new DefaultErrorClassifier();

    const known = classifier.classify(
      createError(ExceptionRuleError.STORAGE_ERROR, 'storage down'),
    );
    expect(known).toEqual(
      expect.objectContaining({
        category: 'system_error',
        severity: 'high',
        priority: 80,
      }),
    );

    const fallback = classifier.classify(
      createError(ExceptionRuleError.PERMISSION_DENIED, 'unknown fallback'),
    );
    expect(fallback).toEqual(
      expect.objectContaining({
        category: 'system_error',
        severity: 'medium',
        priority: 50,
        recoverable: true,
      }),
    );
  });

  it('uses default classification matrix when no pattern exists for the error type', () => {
    const classifier = new DefaultErrorClassifier() as unknown as {
      errorPatterns: Map<ExceptionRuleError, ErrorPattern>;
      classify: (error: ExceptionRuleException) => ErrorClassification;
    };
    classifier.errorPatterns = new Map();

    const dataError = classifier.classify(
      createError(ExceptionRuleError.RULE_NOT_FOUND, 'x'),
    );
    expect(dataError).toEqual({
      category: 'data_error',
      severity: 'medium',
      priority: 60,
      recoverable: true,
      userFriendly: true,
      requiresImmedateAction: false,
    });

    const userError = classifier.classify(
      createError(ExceptionRuleError.DUPLICATE_RULE_NAME, 'x'),
    );
    expect(userError).toEqual({
      category: 'user_error',
      severity: 'low',
      priority: 30,
      recoverable: true,
      userFriendly: true,
      requiresImmedateAction: false,
    });

    const systemError = classifier.classify(
      createError(ExceptionRuleError.STORAGE_ERROR, 'x'),
    );
    expect(systemError).toEqual({
      category: 'system_error',
      severity: 'high',
      priority: 80,
      recoverable: true,
      userFriendly: false,
      requiresImmedateAction: true,
    });

    const networkError = classifier.classify(
      createError(ExceptionRuleError.NETWORK_ERROR, 'x'),
    );
    expect(networkError).toEqual({
      category: 'network_error',
      severity: 'medium',
      priority: 50,
      recoverable: true,
      userFriendly: true,
      requiresImmedateAction: false,
    });

    const fallback = classifier.classify(
      createError(ExceptionRuleError.PERMISSION_DENIED, 'x'),
    );
    expect(fallback).toEqual({
      category: 'system_error',
      severity: 'medium',
      priority: 50,
      recoverable: true,
      userFriendly: false,
      requiresImmedateAction: false,
    });
  });

  it('calculates confidence with and without a matched pattern', () => {
    const classifier = new DefaultErrorClassifier();
    const pattern = classifier.getPattern(ExceptionRuleError.RULE_NOT_FOUND);

    const noPattern = calculateConfidence(
      createError(ExceptionRuleError.RULE_NOT_FOUND, 'anything'),
    );
    expect(noPattern).toBe(0.5);

    const matched = calculateConfidence(
      createError(ExceptionRuleError.RULE_NOT_FOUND, 'Rule ID is missing'),
      pattern,
    );
    expect(matched).toBeGreaterThan(0.7);
    expect(matched).toBeLessThanOrEqual(1.0);

    const syntheticPattern: ErrorPattern = {
      type: ExceptionRuleError.VALIDATION_ERROR,
      keywords: ['alpha', 'beta'],
      classification: {
        category: 'user_error',
        severity: 'medium',
        priority: 50,
        recoverable: true,
        userFriendly: true,
        requiresImmedateAction: false,
      },
      commonCauses: [],
      recommendedActions: [],
    };

    expect(
      calculateConfidence(
        createError(ExceptionRuleError.VALIDATION_ERROR, 'alpha and beta'),
        syntheticPattern,
      ),
    ).toBe(1);
    expect(
      calculateConfidence(
        createError(ExceptionRuleError.VALIDATION_ERROR, 'only alpha'),
        syntheticPattern,
      ),
    ).toBe(0.85);
    expect(
      calculateConfidence(
        createError(ExceptionRuleError.VALIDATION_ERROR, 'none'),
        syntheticPattern,
      ),
    ).toBe(0.7);
  });

  it('deduplicates recommendations and prepends critical guidance', () => {
    const classification: ErrorClassification = {
      category: 'system_error',
      severity: 'critical',
      priority: 99,
      recoverable: true,
      userFriendly: false,
      requiresImmedateAction: true,
    };
    const pattern: ErrorPattern = {
      type: ExceptionRuleError.STORAGE_ERROR,
      keywords: ['storage'],
      classification,
      commonCauses: [],
      recommendedActions: ['retry-now', 'retry-now'],
    };

    const recommendations = generateRecommendations(
      createError(ExceptionRuleError.STORAGE_ERROR, 'storage'),
      classification,
      pattern,
    );

    expect(recommendations).toContain('retry-now');
    expect(recommendations.some((item) => /retry|重新|尝试/i.test(item))).toBe(
      true,
    );
    expect(new Set(recommendations).size).toBe(recommendations.length);
    expect(recommendations[0]).not.toBe('retry-now');
  });

  it('generates user-facing message for friendly patterns and keeps raw message otherwise', () => {
    const classifier = new DefaultErrorClassifier();
    const friendlyPattern = classifier.getPattern(
      ExceptionRuleError.DUPLICATE_RULE_NAME,
    );
    expect(friendlyPattern).toBeDefined();

    const userFriendly = generateUserFriendlyMessage(
      ExceptionRuleError.DUPLICATE_RULE_NAME,
      'raw message',
      friendlyPattern,
    );
    expect(userFriendly).not.toBe('raw message');

    const nonFriendlyPattern: ErrorPattern = {
      ...(friendlyPattern as ErrorPattern),
      classification: {
        ...(friendlyPattern as ErrorPattern).classification,
        userFriendly: false,
      },
    };
    expect(
      generateUserFriendlyMessage(
        ExceptionRuleError.DUPLICATE_RULE_NAME,
        'raw message',
        nonFriendlyPattern,
      ),
    ).toBe('raw message');

    expect(
      generateUserFriendlyMessage(
        ExceptionRuleError.PERMISSION_DENIED,
        'keep me',
        friendlyPattern,
      ),
    ).toBe('keep me');

    expect(
      generateUserFriendlyMessage(
        ExceptionRuleError.RULE_NOT_FOUND,
        'raw',
        friendlyPattern,
      ),
    ).toBe('找不到指定的规则，可能已被删除或移动');
    expect(
      generateUserFriendlyMessage(
        ExceptionRuleError.RULE_TYPE_MISMATCH,
        'raw',
        friendlyPattern,
      ),
    ).toBe('所选规则类型与当前操作不匹配');
    expect(
      generateUserFriendlyMessage(
        ExceptionRuleError.VALIDATION_ERROR,
        'raw',
        friendlyPattern,
      ),
    ).toBe('输入的信息不符合要求，请检查后重试');
    expect(
      generateUserFriendlyMessage(
        ExceptionRuleError.NETWORK_ERROR,
        'raw',
        friendlyPattern,
      ),
    ).toBe('网络连接出现问题，请检查网络后重试');
    expect(
      generateUserFriendlyMessage(ExceptionRuleError.NETWORK_ERROR, 'raw'),
    ).toBe('raw');
  });
});
