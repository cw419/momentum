import type { ExceptionRuleError } from '../../types';

export interface RuleValidationResult {
  isValid: boolean;
  errorType?: ExceptionRuleError;
  errorMessage?: string;
  suggestedActions?: ValidationAction[];
  debugInfo?: Record<string, unknown>;
}

export interface ValidationAction {
  type: 'retry' | 'create_new' | 'use_existing' | 'fix_data';
  label: string;
  description: string;
  handler: () => Promise<void>;
}

export interface ValidationReport {
  totalRules: number;
  validRules: number;
  invalidRules: ValidationIssue[];
  summary: string;
}

export interface ValidationIssue {
  ruleId: string;
  ruleName: string;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  fixable: boolean;
}

export type ActionType = 'pause' | 'early_completion';
