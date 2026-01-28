/**
 * 例外规则存储服务
 *
 * 这是一个门面模块，整合了以下子模块：
 * - RulePersistence: 持久化层
 * - RuleValidator: 验证逻辑
 * - RuleRepository: 规则 CRUD
 * - UsageRecordRepository: 使用记录 CRUD
 *
 * @see src/services/exception-rule-storage/
 */

export {
  ExceptionRuleStorageService,
  exceptionRuleStorage,
} from './exception-rule-storage';
