import type { ReactNode } from 'react';
import { CheckCircle, TrendingUp, History } from 'lucide-react';
import type { ExceptionRule } from '../../types';
import type { SearchResult } from '../../utils/ruleSearchOptimizer';

interface RuleListItemProps {
  index: number;
  itemHeight: number;
  language: string;
  onSelect: (rule: ExceptionRule) => void;
  result: SearchResult;
  rulesLength: number;
  searchQuery: string;
  showCreateNew: boolean;
  formatLastUsed: (date: Date) => string;
  getMatchTypeLabel: (matchType: string) => string;
  highlightText: (text: string, ranges: Array<{ start: number; end: number }>) => ReactNode;
}

export function RuleListItem({
  result,
  index,
  itemHeight,
  onSelect,
  language,
  rulesLength,
  searchQuery,
  showCreateNew,
  highlightText,
  formatLastUsed,
  getMatchTypeLabel
}: RuleListItemProps) {
  const rule = result.rule;
  const usageCount = rule.usageCount || 0;
  const usageUnit = usageCount === 1 ? 'time' : 'times';
  const usageText = language === 'zh' ? `使用过 ${usageCount} 次` : `Used ${usageCount} ${usageUnit}`;
  const actualIndex = showCreateNew && searchQuery ? index - 1 : index;

  if (actualIndex < 0 || actualIndex >= rulesLength) return null;

  return (
    <div
      className="absolute w-full rule-item"
      style={{
        height: itemHeight,
        top: index * itemHeight,
        left: 0
      }}
      data-rule-item
    >
      <button
        type="button"
        onClick={() => onSelect(rule)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200 text-left border border-transparent hover:border-primary-200 dark:hover:border-primary-500/30"
        style={{ height: itemHeight }}
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 dark:text-white truncate">
            {highlightText(rule.name, result.highlightRanges)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <TrendingUp size={12} aria-hidden="true" />
              <span>{usageText}</span>
            </span>
            {rule.lastUsedAt && (
              <span className="flex items-center space-x-1">
                <History size={12} aria-hidden="true" />
                <span>{formatLastUsed(rule.lastUsedAt)}</span>
              </span>
            )}
            {result.matchType !== 'exact' && (
              <span className="text-primary-500 text-xs">{getMatchTypeLabel(result.matchType)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {/* 使用频率可视化 */}
          <div className="flex items-center space-x-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`w-1 h-4 rounded-full ${
                  i < Math.min((rule.usageCount || 0) / 2, 5)
                    ? 'bg-primary-500'
                    : 'bg-gray-200 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          <CheckCircle
            className="text-gray-400 hover:text-primary-500 transition-colors flex-shrink-0"
            size={20}
            aria-hidden="true"
          />
        </div>
      </button>
    </div>
  );
}
