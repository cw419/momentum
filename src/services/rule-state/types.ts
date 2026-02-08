import type { ExceptionRule, ExceptionRuleType } from '../../types';

export type RuleStatus =
  | 'active'
  | 'creating'
  | 'updating'
  | 'deleting'
  | 'error'
  | 'pending';

export interface RuleState {
  id: string;
  status: RuleStatus;
  lastValidated?: Date;
  validationErrors?: string[];
  temporaryId?: string; // 用于跟踪乐观更新的临时ID
  realId?: string; // 实际存储的ID
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingRuleCreation {
  temporaryId: string;
  name: string;
  type: ExceptionRuleType;
  description?: string;
  createdAt: Date;
  promise: Promise<ExceptionRule>;
}

export interface IdMapping {
  temporaryId: string;
  realId: string;
  mappedAt: Date;
}
