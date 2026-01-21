/**
 * 例外规则存储模块的共享类型
 */

import type { ExceptionRule, RuleUsageRecord, ExceptionRuleStorage } from '../../types';

export type ExceptionRuleCreateInput = Pick<ExceptionRule, 'name' | 'type'> &
  Partial<Pick<ExceptionRule, 'description' | 'chainId' | 'scope' | 'isArchived'>>;

export type { ExceptionRule, RuleUsageRecord, ExceptionRuleStorage };

export interface RuleStorageProvider {
  getRulesData(): string | null;
  setRulesData(data: string): void;
  getUsageData(): string | null;
  setUsageData(data: string): void;
}
