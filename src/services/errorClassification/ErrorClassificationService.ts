/**
 * 错误分类服务
 * 对错误进行分类、优先级排序和智能处理建议
 */

import {
  ExceptionRuleError,
  ExceptionRuleException,
  EnhancedExceptionRuleException
} from '../../types';
import {
  ErrorClassification,
  ErrorAnalysis,
  ErrorTrends,
  ErrorStatistics,
  BatchAnalysisResult
} from './types';
import {
  DefaultErrorClassifier,
  calculateConfidence,
  generateRecommendations,
  generateUserFriendlyMessage
} from './ErrorClassifiers';

class ErrorClassificationService {
  private classifier = new DefaultErrorClassifier();
  private errorHistory: ExceptionRuleException[] = [];
  private readonly MAX_HISTORY_SIZE = 100;

  analyzeError(error: ExceptionRuleException): ErrorAnalysis {
    const pattern = this.classifier.getPattern(error.type);
    const classification = this.classifier.classify(error);
    const confidence = calculateConfidence(error, pattern);
    const recommendations = generateRecommendations(error, classification, pattern);
    const relatedErrors = this.findRelatedErrors(error);

    this.recordError(error);

    return {
      error,
      classification,
      pattern,
      confidence,
      recommendations,
      relatedErrors
    };
  }

  classifyError(error: ExceptionRuleException): ErrorClassification {
    return this.classifier.classify(error);
  }

  analyzeErrors(errors: ExceptionRuleException[]): BatchAnalysisResult {
    const analyses = errors.map(error => this.analyzeError(error));

    const criticalErrors = analyses.filter(
      a => a.classification.severity === 'critical'
    ).length;
    const recoverableErrors = analyses.filter(
      a => a.classification.recoverable
    ).length;

    const mostCommonType = this.findMostCommonType(analyses);
    const prioritizedErrors = [...analyses].sort(
      (a, b) => b.classification.priority - a.classification.priority
    );

    return {
      analyses,
      summary: {
        totalErrors: errors.length,
        criticalErrors,
        recoverableErrors,
        mostCommonType,
        prioritizedErrors
      }
    };
  }

  createEnhancedError(
    type: ExceptionRuleError,
    message: string,
    context?: unknown
  ): EnhancedExceptionRuleException {
    const pattern = this.classifier.getPattern(type);
    const classification = this.classifier.classify({ type, message } as ExceptionRuleException);

    return new EnhancedExceptionRuleException(
      type,
      message,
      context,
      classification.recoverable,
      pattern?.recommendedActions || [],
      classification.severity,
      generateUserFriendlyMessage(type, message, pattern),
      { originalMessage: message }
    );
  }

  getErrorTrends(): ErrorTrends {
    const recentErrors = this.errorHistory.slice(-20);
    const errorFrequency = new Map<ExceptionRuleError, number>();
    const timeDistribution = new Map<string, number>();
    const severityDistribution = new Map<string, number>();

    for (const error of this.errorHistory) {
      const count = errorFrequency.get(error.type) || 0;
      errorFrequency.set(error.type, count + 1);

      const hour = new Date().getHours().toString();
      const timeCount = timeDistribution.get(hour) || 0;
      timeDistribution.set(hour, timeCount + 1);

      const classification = this.classifier.classify(error);
      const severityCount = severityDistribution.get(classification.severity) || 0;
      severityDistribution.set(classification.severity, severityCount + 1);
    }

    return {
      recentErrors,
      errorFrequency,
      timeDistribution,
      severityDistribution
    };
  }

  getErrorStatistics(): ErrorStatistics {
    const errorsByType = new Map<ExceptionRuleError, number>();
    const errorsBySeverity = new Map<string, number>();
    const errorsByCategory = new Map<string, number>();

    for (const error of this.errorHistory) {
      const typeCount = errorsByType.get(error.type) || 0;
      errorsByType.set(error.type, typeCount + 1);

      const classification = this.classifier.classify(error);
      const severityCount = errorsBySeverity.get(classification.severity) || 0;
      errorsBySeverity.set(classification.severity, severityCount + 1);

      const categoryCount = errorsByCategory.get(classification.category) || 0;
      errorsByCategory.set(classification.category, categoryCount + 1);
    }

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      errorsBySeverity,
      errorsByCategory
    };
  }

  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  private findMostCommonType(analyses: ErrorAnalysis[]): ExceptionRuleError | null {
    const typeCount = new Map<ExceptionRuleError, number>();
    analyses.forEach(a => {
      const count = typeCount.get(a.error.type) || 0;
      typeCount.set(a.error.type, count + 1);
    });

    let mostCommonType: ExceptionRuleError | null = null;
    let maxCount = 0;
    for (const [type, count] of typeCount) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonType = type;
      }
    }
    return mostCommonType;
  }

  private findRelatedErrors(error: ExceptionRuleException): ExceptionRuleException[] {
    return this.errorHistory
      .filter(e =>
        e.type === error.type ||
        e.message.includes(error.message.split(' ')[0])
      )
      .slice(-5);
  }

  private recordError(error: ExceptionRuleException): void {
    this.errorHistory.push(error);

    if (this.errorHistory.length > this.MAX_HISTORY_SIZE) {
      this.errorHistory = this.errorHistory.slice(-this.MAX_HISTORY_SIZE);
    }
  }
}

export const errorClassificationService = new ErrorClassificationService();
