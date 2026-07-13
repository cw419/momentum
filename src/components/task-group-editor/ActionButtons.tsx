import React from 'react';
import { Save } from 'lucide-react';

interface ActionButtonsProps {
  isEditing: boolean;
  onCancel: () => void;
  tr: (zh: string, en: string) => string;
}

export const ActionButtons: React.FC<ActionButtonsProps> = React.memo(
  ({ isEditing, onCancel, tr }) => (
    <div className="action-buttons flex animate-scale-in flex-col gap-4 pt-4 sm:flex-row sm:gap-6">
      <button
        type="button"
        onClick={onCancel}
        className="focus-ring flex min-h-12 flex-1 items-center justify-center space-x-3 rounded-2xl bg-gray-100 px-8 py-4 font-chinese text-base font-medium text-gray-900 transition duration-300 hover:scale-105 hover:bg-gray-200 active:scale-[0.98] dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
      >
        <span>{tr('取消', 'Cancel')}</span>
      </button>
      <button
        type="submit"
        className="gradient-primary focus-ring flex min-h-12 flex-1 items-center justify-center space-x-3 rounded-2xl px-8 py-4 font-chinese text-base font-medium text-white shadow-lg transition duration-300 hover:scale-105 hover:shadow-xl active:scale-[0.98]"
      >
        <Save size={20} />
        <span>
          {isEditing
            ? tr('保存更改', 'Save changes')
            : tr('创建任务群', 'Create group')}
        </span>
      </button>
    </div>
  ),
);

ActionButtons.displayName = 'ActionButtons';
