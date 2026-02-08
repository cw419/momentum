/**
 * 规则查询/排序（纯逻辑）
 * - 分组（按类型）+ 组内排序
 * - 文本搜索（名称/描述）+ 相关性排序
 */

import { ExceptionRule, ExceptionRuleType } from '../../types';

function compareRulesByUsageAndRecency(
  a: ExceptionRule,
  b: ExceptionRule,
): number {
  // 首先按使用次数排序
  if (a.usageCount !== b.usageCount) {
    return b.usageCount - a.usageCount;
  }

  // 然后按最近使用时间排序
  if (a.lastUsedAt && b.lastUsedAt) {
    return b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
  }

  if (a.lastUsedAt && !b.lastUsedAt) return -1;
  if (!a.lastUsedAt && b.lastUsedAt) return 1;

  // 最后按创建时间排序
  return b.createdAt.getTime() - a.createdAt.getTime();
}

export function groupActiveRulesByType(
  allRules: ExceptionRule[],
): Record<ExceptionRuleType, ExceptionRule[]> {
  const activeRules = allRules.filter((rule) => rule.isActive);

  const grouped: Record<ExceptionRuleType, ExceptionRule[]> = {
    [ExceptionRuleType.PAUSE_ONLY]: [],
    [ExceptionRuleType.EARLY_COMPLETION_ONLY]: [],
  };

  for (const rule of activeRules) {
    grouped[rule.type].push(rule);
  }

  for (const type of Object.values(ExceptionRuleType)) {
    grouped[type].sort(compareRulesByUsageAndRecency);
  }

  return grouped;
}

export function searchRulesInList(
  rules: ExceptionRule[],
  query: string,
): ExceptionRule[] {
  if (!query.trim()) {
    return rules;
  }

  const normalizedQuery = query.toLowerCase().trim();

  return rules
    .filter((rule) => {
      const nameMatch = rule.name.toLowerCase().includes(normalizedQuery);
      const descriptionMatch =
        rule.description?.toLowerCase().includes(normalizedQuery) || false;

      return nameMatch || descriptionMatch;
    })
    .sort((a, b) => {
      // 优先显示名称匹配的结果
      const aNameMatch = a.name.toLowerCase().includes(normalizedQuery);
      const bNameMatch = b.name.toLowerCase().includes(normalizedQuery);

      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;

      // 然后按使用频率排序
      return b.usageCount - a.usageCount;
    });
}
