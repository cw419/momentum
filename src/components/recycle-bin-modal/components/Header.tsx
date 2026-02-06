import React from 'react';
import { Trash2, X } from 'lucide-react';

interface HeaderProps {
  deletedChainsCount: number;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
  onClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({ deletedChainsCount, language, tr, onClose }) => {
  const itemLabel = deletedChainsCount === 1 ? 'ITEM' : 'ITEMS';
  const subtitle =
    language === 'zh'
      ? `回收箱 • ${deletedChainsCount} 项`
      : `RECYCLE BIN • ${deletedChainsCount} ${itemLabel}`;

  return (
    <div className="flex items-center justify-between p-8 border-b border-gray-200 dark:border-slate-600">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
          <Trash2 size={20} className="text-gray-600 dark:text-slate-300" />
        </div>
        <div>
          <h2
            id="recycle-bin-modal-title"
            className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100"
          >
            {tr('回收箱', 'Recycle bin')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 font-mono">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={tr('关闭', 'Close')}
        className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
      >
        <X size={24} className="text-gray-600 dark:text-slate-300" />
      </button>
    </div>
  );
};

