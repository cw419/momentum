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
  const availableRulesText = language === 'zh' ? `${count} 个可用规则` : `${count} available ${ruleLabel}`;

  return (
    <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">{availableRulesText}</div>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          {tr('取消操作', 'Cancel')}
        </button>
      </div>
    </div>
  );
}
