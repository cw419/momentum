type Tr = (zh: string, en: string) => string;

interface LoadingStateProps {
  tr: Tr;
}

export function LoadingState({ tr }: LoadingStateProps) {
  return (
    <div
      className="flex items-center justify-center py-12"
      role="status"
      aria-live="polite"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-500"></div>
      <span className="ml-3 text-gray-600 dark:text-gray-400">
        {tr('加载规则中...', 'Loading rules...')}
      </span>
    </div>
  );
}
