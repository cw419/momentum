import React from 'react';
import { getRsipTypeLabel, rsipTypeColorMap, rsipTypeEmojiMap } from './rsipUi';

interface RSIPFiltersProps {
  filterType: string | null;
  onFilterTypeChange: (next: string | null) => void;
  language: string;
  tr: (zh: string, en: string) => string;
}

export const RSIPFilters: React.FC<RSIPFiltersProps> = ({ filterType, onFilterTypeChange, language, tr }) => {
  return (
    <div className="bento-card mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <label className="text-sm font-chinese text-gray-700 dark:text-slate-300">
            {tr('按类型筛选：', 'Filter by type:')}
          </label>
          <select
            value={filterType || ''}
            onChange={(e) => onFilterTypeChange(e.target.value || null)}
            className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-3 py-2 text-gray-900 dark:text-slate-100"
          >
            <option value="">{tr('全部', 'All')}</option>
            {Object.keys(rsipTypeEmojiMap).map(t => (
              <option key={t} value={t}>
                {getRsipTypeLabel(language, t)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onFilterTypeChange(null)}
            className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-xs"
          >
            {tr('清除', 'Clear')}
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {Object.keys(rsipTypeColorMap).map(t => {
            const col = rsipTypeColorMap[t];
            return (
              <div key={t} className={`px-2 py-1 rounded-lg ${col.badge} text-xs font-chinese`}>
                {getRsipTypeLabel(language, t)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

