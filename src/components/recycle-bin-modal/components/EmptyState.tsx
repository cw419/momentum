import React from 'react';
import { Trash2 } from 'lucide-react';

export const EmptyState: React.FC<{ tr: (zh: string, en: string) => string }> = ({ tr }) => (
  <div className="flex-1 flex items-center justify-center py-16">
    <div className="text-center max-w-md px-8">
      <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-6">
        <Trash2 size={32} className="text-gray-400 dark:text-slate-500" />
      </div>
      <h3 className="text-xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-2">
        {tr('回收箱为空', 'Recycle bin is empty')}
      </h3>
      <p className="text-gray-600 dark:text-slate-400 leading-relaxed mb-4">
        {tr(
          '删除的链条会出现在这里，你可以选择恢复或永久删除它们。',
          'Deleted chains appear here. You can restore them or delete them permanently.',
        )}
      </p>
    </div>
  </div>
);

