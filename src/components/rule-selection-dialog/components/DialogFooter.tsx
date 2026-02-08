export function DialogFooter({
  language,
  tr,
  count,
  onCancel,
}: {
  language: string;
  tr: (zh: string, en: string) => string;
  count: number;
  onCancel: () => void;
}) {
  const ruleLabel = count === 1 ? 'rule' : 'rules';
  const availableRulesText =
    language === 'zh'
      ? `${count} 个可用规则`
      : `${count} available ${ruleLabel}`;

  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-700/50">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {availableRulesText}
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {tr('取消操作', 'Cancel')}
        </button>
      </div>
    </div>
  );
}
