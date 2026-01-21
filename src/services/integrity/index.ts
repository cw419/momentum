/**
 * 完整性检查模块导出
 *
 * 这是一个门面模块，整合了以下子模块：
 * - IntegrityTypes: 类型定义
 * - IntegrityValidators: 验证器集合
 * - IntegrityRules: 规则定义
 * - RuleIntegrityChecker: 规则完整性检查
 * - UsageRecordIntegrityChecker: 使用记录检查
 * - IntegrityReportGenerator: 报告生成
 */

export * from './IntegrityTypes';
export * from './IntegrityValidators';
export { integrityReportGenerator } from './IntegrityReportGenerator';
export { ruleIntegrityChecker, RuleIntegrityChecker } from './RuleIntegrityChecker';
export { usageRecordIntegrityChecker, UsageRecordIntegrityChecker } from './UsageRecordIntegrityChecker';
