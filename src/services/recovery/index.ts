/**
 * 错误恢复模块索引
 * 导出所有恢复相关的类型、类和函数
 */

// 核心类型和接口
export type {
  RecoveryResult,
  RecoveryAction,
  RecoveryContext,
  RecoveryStrategy,
  RecoveryHistoryEntry
} from './RecoveryStrategy';

export {
  RecoveryStrategyRegistry,
  recoveryStrategyRegistry
} from './RecoveryStrategy';

// 恢复选项提供器
export {
  RecoveryOptionsProvider,
  recoveryOptionsProvider
} from './RecoveryOptionsProvider';

// 恢复处理器
export {
  recoveryHandlers,
  extractRuleIdFromError,
  extractRuleNameFromError
} from './RecoveryHandlers';

// 默认策略
export {
  initializeDefaultStrategies,
  createUnknownErrorResult,
  createRecoveryFailureResult
} from './DefaultStrategies';
