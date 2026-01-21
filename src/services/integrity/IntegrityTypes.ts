/**
 * 数据完整性检查类型定义
 */

export type IntegrityIssueType =
  | 'missing_id'
  | 'duplicate_name'
  | 'invalid_type'
  | 'orphaned_record'
  | 'missing_created_at'
  | 'invalid_usage_count';

export type IntegritySeverity = 'critical' | 'warning' | 'info';

export interface IntegrityIssue {
  type: IntegrityIssueType;
  severity: IntegritySeverity;
  description: string;
  affectedItems: string[];
  autoFixable: boolean;
  fixAction?: () => Promise<void>;
  details?: Record<string, unknown>;
}

export interface IntegrityReport {
  issues: IntegrityIssue[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
    infoIssues: number;
    autoFixableIssues: number;
  };
  recommendations: string[];
}

export interface FixResult {
  issueType: string;
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * 验证器接口 - 策略模式
 */
export interface IntegrityValidator<T> {
  validate(data: T, context?: ValidatorContext): IntegrityIssue[];
}

export interface ValidatorContext {
  generateUniqueId: () => string;
  updateRule: (rule: unknown) => Promise<void>;
  updateUsageRecordsRuleId: (oldId: string, newId: string) => Promise<void>;
  removeUsageRecord: (recordId: string) => Promise<void>;
  updateUsageRecord: (record: unknown) => Promise<void>;
}

/**
 * 完整性规则接口 - 策略模式
 */
export interface IntegrityRule<T, U = undefined> {
  check(primary: T, secondary?: U): Promise<IntegrityIssue[]>;
}
