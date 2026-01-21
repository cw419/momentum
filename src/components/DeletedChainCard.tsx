import React from 'react';
import { DeletedChain } from '../types';
import { getChainTypeConfig } from '../utils/chainTree';
import { Icon } from '../utils/iconMap';
import { RotateCcw, Trash2, CheckSquare, Square } from 'lucide-react';
import { useI18n } from '../i18n';

interface DeletedChainCardProps {
  chain: DeletedChain;
  isSelected: boolean;
  onSelect: (chainId: string, selected: boolean) => void;
  onRestore: (chainId: string) => void;
  onPermanentDelete: (chainId: string) => void;
  deletedTimeText: string;
}

export const DeletedChainCard: React.FC<DeletedChainCardProps> = ({
  chain,
  isSelected,
  onSelect,
  onRestore,
  onPermanentDelete,
  deletedTimeText,
}) => {
  const { language, tr } = useI18n();
  const typeConfig = getChainTypeConfig(chain.type, language);

  const handleSelectToggle = () => {
    onSelect(chain.id, !isSelected);
  };

  return (
    <div
      className={`
        relative rounded-2xl shadow-lg border-2 transition-all duration-300 overflow-hidden cursor-pointer
        ${isSelected
          ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-blue-200 dark:shadow-blue-900/30 scale-[1.02]'
          : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500 opacity-80 hover:opacity-100'
        }
      `}
      onClick={handleSelectToggle}
    >
      {/* Selection Indicator */}
      <div className={`
        absolute top-4 right-4 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200
        ${isSelected
          ? 'bg-blue-500 text-white shadow-md'
          : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:hover:bg-slate-600'
        }
      `}>
        {isSelected ? (
          <CheckSquare size={16} />
        ) : (
          <Square size={16} />
        )}
      </div>

      <div className="p-5">
        {/* Chain Type and Name */}
        <div className="flex items-start space-x-3 mb-4 pr-8">
          <div className={`w-11 h-11 rounded-xl ${typeConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
            <Icon name={typeConfig.icon} size={18} className={typeConfig.color} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold font-chinese text-gray-900 dark:text-slate-100 text-base leading-tight mb-1 truncate">
              {chain.name}
            </h3>
            <span className={`inline-block px-2 py-0.5 rounded-md text-xs ${typeConfig.bgColor} ${typeConfig.color} font-medium`}>
              {typeConfig.name}
            </span>
          </div>
        </div>

        {/* Chain Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              {chain.currentStreak}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 font-mono uppercase tracking-wide">
              {tr('当前连击', 'CURRENT STREAK')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              {chain.totalCompletions}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 font-mono uppercase tracking-wide">
              {tr('总完成数', 'TOTAL COMPLETIONS')}
            </div>
          </div>
        </div>

        {/* Deletion Info */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-slate-400">{tr('删除时间', 'Deleted')}</span>
            <span className="text-gray-800 dark:text-slate-200 font-medium">{deletedTimeText}</span>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            {tr('30天后将自动永久删除', 'Automatically deleted after 30 days')}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onRestore(chain.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:text-white rounded-xl transition-all duration-200 text-sm font-medium"
          >
            <RotateCcw size={14} />
            <span>{tr('恢复', 'Restore')}</span>
          </button>
          <button
            type="button"
            onClick={() => onPermanentDelete(chain.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white dark:text-red-400 dark:hover:text-white rounded-xl transition-all duration-200 text-sm font-medium"
          >
            <Trash2 size={14} />
            <span>{tr('删除', 'Delete')}</span>
          </button>
        </div>

        {/* Description (if exists) */}
        {chain.description && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
            <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-2 break-words">
              {chain.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
