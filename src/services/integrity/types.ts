/**
 * 数据完整性检查模块的类型定义
 */

export interface IntegrityIssue {
  type: 'missing_id' | 'duplicate_name' | 'invalid_type' | 'orphaned_record' | 'missing_created_at' | 'invalid_usage_count';
  severity: 'critical' | 'warning' | 'info';
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
