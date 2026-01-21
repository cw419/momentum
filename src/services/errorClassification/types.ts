/**
 * 错误分类类型定义
 */

import { ExceptionRuleError, ExceptionRuleException } from '../../types';

export interface ErrorClassification {
  category: 'user_error' | 'system_error' | 'data_error' | 'network_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  priority: number;
  recoverable: boolean;
  userFriendly: boolean;
  requiresImmedateAction: boolean;
}

export interface ErrorPattern {
  type: ExceptionRuleError;
  keywords: string[];
  classification: ErrorClassification;
  commonCauses: string[];
  recommendedActions: string[];
}

export interface ErrorAnalysis {
  error: ExceptionRuleException;
  classification: ErrorClassification;
  pattern?: ErrorPattern;
  confidence: number;
  recommendations: string[];
  relatedErrors: ExceptionRuleException[];
}

export interface ErrorTrends {
  recentErrors: ExceptionRuleException[];
  errorFrequency: Map<ExceptionRuleError, number>;
  timeDistribution: Map<string, number>;
  severityDistribution: Map<string, number>;
}

export interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Map<ExceptionRuleError, number>;
  errorsBySeverity: Map<string, number>;
  errorsByCategory: Map<string, number>;
}

export interface BatchAnalysisResult {
  analyses: ErrorAnalysis[];
  summary: {
    totalErrors: number;
    criticalErrors: number;
    recoverableErrors: number;
    mostCommonType: ExceptionRuleError | null;
    prioritizedErrors: ErrorAnalysis[];
  };
}

export interface ErrorClassifier {
  classify(error: ExceptionRuleException): ErrorClassification;
  getPattern(type: ExceptionRuleError): ErrorPattern | undefined;
}
