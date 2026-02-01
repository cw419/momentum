import React from 'react';
import { Dices, X } from 'lucide-react';

interface BettingHeaderProps {
  tr: (zh: string, en: string) => string;
  onClose: () => void;
}

export const BettingHeader: React.FC<BettingHeaderProps> = ({ tr, onClose }) => (
  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
        <Dices className="text-white" size={20} />
      </div>
      <h2 id="betting-modal-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {tr('任务押注', 'Task bet')}
      </h2>
    </div>
    <button
      type="button"
      onClick={onClose}
      aria-label={tr('关闭', 'Close')}
      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus-ring rounded"
    >
      <X size={24} />
    </button>
  </div>
);
