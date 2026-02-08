/**
 * 错误分类器
 * 实现错误分类逻辑和策略
 */

import { ExceptionRuleError, ExceptionRuleException } from '../../types';
import { ErrorClassification, ErrorPattern, ErrorClassifier } from './types';
import { createErrorPatterns } from './ErrorPatterns';

export class DefaultErrorClassifier implements ErrorClassifier {
  private errorPatterns: Map<ExceptionRuleError, ErrorPattern>;

  constructor() {
    this.errorPatterns = createErrorPatterns();
  }

  classify(error: ExceptionRuleException): ErrorClassification {
    const pattern = this.errorPatterns.get(error.type);

    if (pattern) {
      return pattern.classification;
    }

    return this.getDefaultClassification(error.type);
  }

  getPattern(type: ExceptionRuleError): ErrorPattern | undefined {
    return this.errorPatterns.get(type);
  }

  private getDefaultClassification(
    type: ExceptionRuleError,
  ): ErrorClassification {
    switch (type) {
      case ExceptionRuleError.RULE_NOT_FOUND:
      case ExceptionRuleError.DATA_INTEGRITY_ERROR:
      case ExceptionRuleError.RULE_STATE_INCONSISTENT:
        return {
          category: 'data_error',
          severity: 'medium',
          priority: 60,
          recoverable: true,
          userFriendly: true,
          requiresImmedateAction: false,
        };

      case ExceptionRuleError.DUPLICATE_RULE_NAME:
      case ExceptionRuleError.VALIDATION_ERROR:
      case ExceptionRuleError.RULE_TYPE_MISMATCH:
        return {
          category: 'user_error',
          severity: 'low',
          priority: 30,
          recoverable: true,
          userFriendly: true,
          requiresImmedateAction: false,
        };

      case ExceptionRuleError.STORAGE_ERROR:
      case ExceptionRuleError.OPERATION_TIMEOUT:
      case ExceptionRuleError.CONCURRENT_MODIFICATION:
        return {
          category: 'system_error',
          severity: 'high',
          priority: 80,
          recoverable: true,
          userFriendly: false,
          requiresImmedateAction: true,
        };

      case ExceptionRuleError.NETWORK_ERROR:
        return {
          category: 'network_error',
          severity: 'medium',
          priority: 50,
          recoverable: true,
          userFriendly: true,
          requiresImmedateAction: false,
        };

      default:
        return {
          category: 'system_error',
          severity: 'medium',
          priority: 50,
          recoverable: true,
          userFriendly: false,
          requiresImmedateAction: false,
        };
    }
  }
}

export function calculateConfidence(
  error: ExceptionRuleException,
  pattern?: ErrorPattern,
): number {
  if (!pattern) return 0.5;

  let confidence = 0.7;

  const message = error.message.toLowerCase();
  const matchedKeywords = pattern.keywords.filter((keyword) =>
    message.includes(keyword.toLowerCase()),
  );

  confidence += (matchedKeywords.length / pattern.keywords.length) * 0.3;

  return Math.min(confidence, 1.0);
}

export function generateRecommendations(
  _error: ExceptionRuleException,
  classification: ErrorClassification,
  pattern?: ErrorPattern,
): string[] {
  const recommendations: string[] = [];

  if (pattern) {
    recommendations.push(...pattern.recommendedActions);
  }

  if (classification.severity === 'critical') {
    recommendations.unshift('立即联系技术支持');
  }

  if (classification.recoverable) {
    recommendations.push('尝试重新执行操作');
  }

  return [...new Set(recommendations)];
}

export function generateUserFriendlyMessage(
  type: ExceptionRuleError,
  message: string,
  pattern?: ErrorPattern,
): string {
  if (pattern && pattern.classification.userFriendly) {
    switch (type) {
      case ExceptionRuleError.RULE_NOT_FOUND:
        return '找不到指定的规则，可能已被删除或移动';
      case ExceptionRuleError.DUPLICATE_RULE_NAME:
        return '规则名称已存在，请选择不同的名称';
      case ExceptionRuleError.RULE_TYPE_MISMATCH:
        return '所选规则类型与当前操作不匹配';
      case ExceptionRuleError.VALIDATION_ERROR:
        return '输入的信息不符合要求，请检查后重试';
      case ExceptionRuleError.NETWORK_ERROR:
        return '网络连接出现问题，请检查网络后重试';
      default:
        return message;
    }
  }

  return message;
}
