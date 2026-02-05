import type { ExceptionRule } from '../../../types';

export type DuplicationConflictType = 'exact' | 'similar' | 'none';
type DuplicationSuggestionType = 'use_existing' | 'modify_name' | 'create_anyway' | 'merge_rules';

export interface DuplicationCheckResult {
  hasConflict: boolean;
  conflictType: DuplicationConflictType;
  existingRules: ExceptionRule[];
  suggestions: DuplicationSuggestion[];
  canProceed: boolean;
}

export interface DuplicationSuggestion {
  type: DuplicationSuggestionType;
  title: string;
  description: string;
  rule?: ExceptionRule;
  suggestedName?: string;
  handler: () => Promise<ExceptionRule | null>;
}
