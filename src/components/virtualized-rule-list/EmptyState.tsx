import { Plus } from 'lucide-react';

type Tr = (zh: string, en: string) => string;

interface EmptyStateProps {
  onCreateNew?: (name: string) => void;
  searchQuery: string;
  tr: Tr;
}

export function EmptyState({ searchQuery, onCreateNew, tr }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-gray-500 dark:text-gray-400 mb-4">
        {searchQuery ? tr('未找到匹配的规则', 'No matching rules found') : tr('暂无可用规则', 'No rules available')}
      </div>
      {searchQuery && onCreateNew && (
        <button
          type="button"
          onClick={() => onCreateNew(searchQuery)}
          aria-label={tr(`创建 "${searchQuery}"`, `Create "${searchQuery}"`)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} aria-hidden="true" />
          <span>{tr(`创建 "${searchQuery}"`, `Create "${searchQuery}"`)}</span>
        </button>
      )}
    </div>
  );
}

