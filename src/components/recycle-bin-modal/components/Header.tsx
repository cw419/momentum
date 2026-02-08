import React from 'react';
import { Trash2, X } from 'lucide-react';

interface HeaderProps {
  deletedChainsCount: number;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
  onClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  deletedChainsCount,
  language,
  tr,
  onClose,
}) => {
  const itemLabel = deletedChainsCount === 1 ? 'ITEM' : 'ITEMS';
  const subtitle =
    language === 'zh'
      ? `回收箱 • ${deletedChainsCount} 项`
      : `RECYCLE BIN • ${deletedChainsCount} ${itemLabel}`;

  return (
    <div className="flex items-center justify-between border-b border-gray-200 p-8 dark:border-slate-600">
      <div className="flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-700">
          <Trash2 size={20} className="text-gray-600 dark:text-slate-300" />
        </div>
        <div>
          <h2
            id="recycle-bin-modal-title"
            className="font-chinese text-2xl font-bold text-gray-900 dark:text-slate-100"
          >
            {tr('回收箱', 'Recycle bin')}
          </h2>
          <p className="font-mono text-sm text-gray-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={tr('关闭', 'Close')}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
      >
        <X size={24} className="text-gray-600 dark:text-slate-300" />
      </button>
    </div>
  );
};
