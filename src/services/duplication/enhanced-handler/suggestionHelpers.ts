import type { ExceptionRule } from '../../../types';
import { getCurrentLanguage, tr } from '../../../utils/runtimeI18n';
import type { DuplicationConflictType, DuplicationSuggestion } from './types';

export function generateNameSuggestions(
  baseName: string,
  existingNames: string[],
): string[] {
  const suggestions: string[] = [];

  for (let i = 2; i <= 5; i++) {
    const suggestion = `${baseName} ${i}`;
    if (
      !existingNames.some(
        (name) => name.toLowerCase() === suggestion.toLowerCase(),
      )
    ) {
      suggestions.push(suggestion);
    }
  }

  const language = getCurrentLanguage();
  const descriptiveSuffixes =
    language === 'zh'
      ? ['新', '备用', '临时', '特殊']
      : ['New', 'Spare', 'Temp', 'Special'];
  for (const suffix of descriptiveSuffixes) {
    const suggestion = `${baseName}(${suffix})`;
    if (
      !existingNames.some(
        (name) => name.toLowerCase() === suggestion.toLowerCase(),
      )
    ) {
      suggestions.push(suggestion);
    }
  }

  const timestamp = new Date()
    .toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      month: '2-digit',
      day: '2-digit',
    })
    .replace(/\//g, '');
  const timestampSuggestion = `${baseName}_${timestamp}`;
  if (
    !existingNames.some(
      (name) => name.toLowerCase() === timestampSuggestion.toLowerCase(),
    )
  ) {
    suggestions.push(timestampSuggestion);
  }

  return suggestions.slice(0, 3);
}

export function generateSuggestions(
  name: string,
  conflictType: DuplicationConflictType,
  existingRules: ExceptionRule[],
): DuplicationSuggestion[] {
  const suggestions: DuplicationSuggestion[] = [];

  if (conflictType === 'exact') {
    const existingRule = existingRules[0];

    suggestions.push({
      type: 'use_existing',
      title: tr('使用现有规则', 'Use existing rule'),
      description: tr(
        `使用已存在的规则 "${existingRule.name}"`,
        `Use the existing rule "${existingRule.name}"`,
      ),
      rule: existingRule,
      handler: async () => existingRule,
    });

    const nameSuggestions = generateNameSuggestions(
      name,
      existingRules.map((r) => r.name),
    );

    nameSuggestions.forEach((suggestedName) => {
      suggestions.push({
        type: 'modify_name',
        title: tr('修改名称', 'Change name'),
        description: tr(
          `使用建议的名称 "${suggestedName}"`,
          `Use the suggested name "${suggestedName}"`,
        ),
        suggestedName,
        handler: async () => null,
      });
    });
  } else if (conflictType === 'similar') {
    suggestions.push({
      type: 'create_anyway',
      title: tr('继续创建', 'Continue'),
      description: tr(
        '名称相似但不完全相同，可以继续创建',
        'Name is similar but not identical; you can continue creating it',
      ),
      handler: async () => null,
    });

    if (existingRules.length > 0) {
      const mostSimilar = existingRules[0];
      suggestions.push({
        type: 'use_existing',
        title: tr('使用相似规则', 'Use similar rule'),
        description: tr(
          `考虑使用相似的规则 "${mostSimilar.name}"`,
          `Consider using the similar rule "${mostSimilar.name}"`,
        ),
        rule: mostSimilar,
        handler: async () => mostSimilar,
      });
    }
  }

  return suggestions;
}

export function getConflictMessage(
  conflictType: DuplicationConflictType,
  existingRules: ExceptionRule[],
): string {
  if (conflictType === 'exact') {
    return tr(
      `规则名称 "${existingRules[0].name}" 已存在`,
      `Rule name "${existingRules[0].name}" already exists`,
    );
  }

  if (conflictType === 'similar') {
    const similarNames = existingRules.map((r) => r.name).join('", "');
    return tr(
      `发现相似的规则名称: "${similarNames}"`,
      `Found similar rule name(s): "${similarNames}"`,
    );
  }

  return tr('没有发现冲突', 'No conflict detected');
}
