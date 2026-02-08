import type { ExceptionRule, ExceptionRuleType } from '../../../types';
import { isRecord } from './coercions';

type ExceptionRuleImportFields = 'name' | 'type' | 'description';
export type ExceptionRuleImportData = Pick<
  ExceptionRule,
  ExceptionRuleImportFields
>;

function isExceptionRuleType(value: unknown): value is ExceptionRuleType {
  return value === 'pause_only' || value === 'early_completion_only';
}

export function parseExceptionRulesToImport(
  exceptionRules: unknown,
): ExceptionRuleImportData[] {
  const exceptionRulesToImport: ExceptionRuleImportData[] = [];
  if (!isRecord(exceptionRules) || !Array.isArray(exceptionRules.rules))
    return exceptionRulesToImport;

  for (const raw of exceptionRules.rules as unknown[]) {
    if (!isRecord(raw)) continue;
    if (!('name' in raw) || !('type' in raw)) continue;
    if (typeof raw.name !== 'string' || !isExceptionRuleType(raw.type))
      continue;

    exceptionRulesToImport.push({
      name: raw.name,
      type: raw.type,
      description:
        typeof raw.description === 'string' ? raw.description : undefined,
    });
  }

  return exceptionRulesToImport;
}
