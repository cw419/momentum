import type { ExceptionRule, ExceptionRuleType } from '../../../types';
import { ExceptionRuleError, ExceptionRuleException } from '../../../types';
import { exceptionRuleStorage } from '../../ExceptionRuleStorage';
import { tr } from '../../../utils/runtimeI18n';
import { isCommonRulePattern } from '../duplicationDetection';
import type { DuplicationCheckResult } from '../../EnhancedDuplicationHandler';
import { generateNameSuggestions } from './suggestionHelpers';

export async function createRuleIfNoConflict(
  name: string,
  type: ExceptionRuleType,
  description?: string
): Promise<{
  rule: ExceptionRule;
  action: string;
  warnings: string[];
}> {
  const trimmedName = name.trim();
  const warnings: string[] = [];

  if (isCommonRulePattern(trimmedName)) {
    warnings.push(
      tr(
        '这是一个常见的规则模式，建议检查是否已有类似规则',
        'This is a common rule pattern; consider checking for existing similar rules'
      )
    );
  }

  const rule = await exceptionRuleStorage.createRule({
    name: trimmedName,
    type,
    description: description?.trim(),
    scope: 'global',
    chainId: undefined,
    isArchived: false
  });

  return {
    rule,
    action: 'created_new',
    warnings
  };
}

export async function handleUseExisting(
  existingRules: ExceptionRule[],
  requestedType: ExceptionRuleType
): Promise<{
  rule: ExceptionRule;
  action: string;
  warnings: string[];
}> {
  const matchingRule = existingRules.find(rule => rule.type === requestedType);

  if (matchingRule) {
    return {
      rule: matchingRule,
      action: 'used_existing',
      warnings: []
    };
  }

  const rule = existingRules[0];
  const warnings = [
    tr(
      `使用的规则类型 (${rule.type}) 与请求的类型 (${requestedType}) 不匹配`,
      `Rule type (${rule.type}) does not match requested type (${requestedType})`
    )
  ];

  return {
    rule,
    action: 'used_existing_different_type',
    warnings
  };
}

export async function handleModifyName(
  baseName: string,
  type: ExceptionRuleType,
  description?: string
): Promise<{
  rule: ExceptionRule;
  action: string;
  warnings: string[];
}> {
  const allRules = await exceptionRuleStorage.getRules();
  const existingNames = allRules.map(r => r.name);
  const suggestions = generateNameSuggestions(baseName, existingNames);

  if (suggestions.length === 0) {
    throw new ExceptionRuleException(
      ExceptionRuleError.DUPLICATE_RULE_NAME,
      tr('无法生成可用的名称建议', 'Unable to generate a usable name suggestion')
    );
  }

  const newName = suggestions[0];
  const rule = await exceptionRuleStorage.createRule({
    name: newName,
    type,
    description,
    scope: 'global',
    chainId: undefined,
    isArchived: false
  });

  return {
    rule,
    action: 'created_with_modified_name',
    warnings: [tr(`名称已修改为 "${newName}"`, `Name changed to "${newName}"`)]
  };
}

export async function handleCreateAnyway(
  name: string,
  type: ExceptionRuleType,
  description: string | undefined,
  checkResult: DuplicationCheckResult
): Promise<{
  rule: ExceptionRule;
  action: string;
  warnings: string[];
}> {
  const rule = await exceptionRuleStorage.createRule({
    name: name.trim(),
    type,
    description: description?.trim(),
    scope: 'global',
    chainId: undefined,
    isArchived: false
  });

  const warnings: string[] = [];
  if (checkResult.conflictType === 'similar') {
    const similarNames = checkResult.existingRules.map(r => r.name).join('", "');
    warnings.push(
      tr(
        `发现相似规则: "${similarNames}"`,
        `Similar rules found: "${similarNames}"`
      )
    );
  }

  return {
    rule,
    action: 'created_despite_similarity',
    warnings
  };
}

