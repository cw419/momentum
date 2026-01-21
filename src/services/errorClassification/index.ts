/**
 * 错误分类模块导出
 */

export { ErrorClassificationService, errorClassificationService } from './ErrorClassificationService';
export { DefaultErrorClassifier, calculateConfidence, generateRecommendations, generateUserFriendlyMessage } from './ErrorClassifiers';
export { createErrorPatterns } from './ErrorPatterns';
export type {
  ErrorClassification,
  ErrorPattern,
  ErrorAnalysis,
  ErrorTrends,
  ErrorStatistics,
  BatchAnalysisResult,
  ErrorClassifier
} from './types';
