import type { ExceptionRule, ExceptionRuleType } from '../../types';

export interface RuleManagerViewProps {
  onClose: () => void;
  initialFilter?: ExceptionRuleType;
  onRuleSelected?: (rule: ExceptionRule) => void;
}

export type SortBy = 'name' | 'usage' | 'created' | 'lastUsed';

export interface RuleManagerFormData {
  name: string;
  type: ExceptionRuleType;
  description: string;
}

