/**
 * 错误分类服务 - 转发导出
 * 实际实现已拆分至 errorClassification/ 目录
 * 此文件保持向后兼容性
 */

export {
  ErrorClassificationService,
  errorClassificationService
} from './errorClassification';

export type {
  ErrorClassification,
  ErrorPattern,
  ErrorAnalysis,
  ErrorTrends,
  ErrorStatistics,
  BatchAnalysisResult,
  ErrorClassifier
} from './errorClassification';
