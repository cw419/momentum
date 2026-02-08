import React from 'react';
import { Search } from 'lucide-react';

export function SearchBar({
  tr,
  searchInputRef,
  value,
  onChange,
}: {
  tr: (zh: string, en: string) => string;
  searchInputRef: React.RefObject<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative mb-4">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
        size={20}
      />
      <input
        ref={searchInputRef}
        type="text"
        placeholder={tr(
          '搜索规则或输入新规则名称...',
          'Search rules or type a new rule name...',
        )}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
    </div>
  );
}
