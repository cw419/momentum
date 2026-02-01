import { Plus } from 'lucide-react';

type Tr = (zh: string, en: string) => string;

interface CreateNewRuleItemProps {
  itemHeight: number;
  onCreateNew: (name: string) => void;
  searchQuery: string;
  tr: Tr;
}

export function CreateNewRuleItem({ itemHeight, onCreateNew, searchQuery, tr }: CreateNewRuleItemProps) {
  return (
    <div
      className="absolute w-full"
      style={{
        height: itemHeight,
        top: 0,
        left: 0
      }}
    >
      <button
        type="button"
        onClick={() => onCreateNew(searchQuery)}
        aria-label={tr(`创建新规则: "${searchQuery}"`, `Create new rule: "${searchQuery}"`)}
        className="w-full flex items-center space-x-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30 hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors text-left"
        style={{ height: itemHeight }}
      >
        <Plus className="text-primary-500 flex-shrink-0" size={20} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-primary-700 dark:text-primary-300 truncate">
            {tr(`创建新规则: "${searchQuery}"`, `Create new rule: "${searchQuery}"`)}
          </div>
          <div className="text-sm text-primary-600 dark:text-primary-400">
            {tr('为当前任务链创建专属规则', 'Create a chain-specific rule')}
          </div>
        </div>
      </button>
    </div>
  );
}

