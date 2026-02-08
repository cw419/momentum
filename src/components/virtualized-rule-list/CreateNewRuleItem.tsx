import { Plus } from 'lucide-react';

type Tr = (zh: string, en: string) => string;

interface CreateNewRuleItemProps {
  itemHeight: number;
  onCreateNew: (name: string) => void;
  searchQuery: string;
  tr: Tr;
}

export function CreateNewRuleItem({
  itemHeight,
  onCreateNew,
  searchQuery,
  tr,
}: CreateNewRuleItemProps) {
  return (
    <div
      className="absolute w-full"
      style={{
        height: itemHeight,
        top: 0,
        left: 0,
      }}
    >
      <button
        type="button"
        onClick={() => onCreateNew(searchQuery)}
        aria-label={tr(
          `创建新规则: "${searchQuery}"`,
          `Create new rule: "${searchQuery}"`,
        )}
        className="flex w-full items-center space-x-3 rounded-xl border border-primary-200 bg-primary-50 p-4 text-left transition-colors hover:bg-primary-100 dark:border-primary-500/30 dark:bg-primary-500/10 dark:hover:bg-primary-500/20"
        style={{ height: itemHeight }}
      >
        <Plus
          className="flex-shrink-0 text-primary-500"
          size={20}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-primary-700 dark:text-primary-300">
            {tr(
              `创建新规则: "${searchQuery}"`,
              `Create new rule: "${searchQuery}"`,
            )}
          </div>
          <div className="text-sm text-primary-600 dark:text-primary-400">
            {tr('为当前任务链创建专属规则', 'Create a chain-specific rule')}
          </div>
        </div>
      </button>
    </div>
  );
}
