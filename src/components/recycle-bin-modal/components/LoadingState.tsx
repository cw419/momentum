import React from 'react';

export const LoadingState: React.FC<{ tr: (zh: string, en: string) => string }> = ({ tr }) => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
        <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
      <p className="text-gray-600 dark:text-slate-400 font-chinese">{tr('正在加载…', 'Loading…')}</p>
    </div>
  </div>
);

