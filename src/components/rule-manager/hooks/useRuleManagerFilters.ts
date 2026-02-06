import { useMemo, useState } from 'react';
import type { ExceptionRule, ExceptionRuleType } from '../../../types';
import type { SortBy } from '../types';

function sortRules(rules: ExceptionRule[], sortBy: SortBy): ExceptionRule[] {
  rules.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'usage':
        return b.usageCount - a.usageCount;
      case 'created':
        return b.createdAt.getTime() - a.createdAt.getTime();
      case 'lastUsed':
        if (a.lastUsedAt && b.lastUsedAt) {
          return b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
        }
        if (a.lastUsedAt && !b.lastUsedAt) return -1;
        if (!a.lastUsedAt && b.lastUsedAt) return 1;
        return 0;
      default:
        return 0;
    }
  });

  return rules;
}

export function useRuleManagerFilters(args: {
  rules: ExceptionRule[];
  initialFilter?: ExceptionRuleType;
}) {
  const { rules, initialFilter } = args;

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ExceptionRuleType | 'all'>(initialFilter || 'all');
  const [sortBy, setSortBy] = useState<SortBy>('usage');

  const filteredRules = useMemo(() => {
    let filtered = rules.filter((rule) => rule.isActive);

    if (typeFilter !== 'all') {
      filtered = filtered.filter((rule) => rule.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (rule) =>
          rule.name.toLowerCase().includes(query) ||
          rule.description?.toLowerCase().includes(query) === true
      );
    }

    return sortRules(filtered, sortBy);
  }, [rules, searchQuery, typeFilter, sortBy]);

  return {
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    sortBy,
    setSortBy,
    filteredRules,
  };
}

