import React from 'react';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { HeaderProps } from './types';

export const ChainDetailHeader: React.FC<HeaderProps> = ({
  chainName,
  tr,
  onBack,
  onEdit,
  onDeleteClick,
}) => (
  <header className="flex items-center justify-between mb-12 animate-fade-in">
    <div className="flex items-center space-x-4">
      <button
        onClick={onBack}
        className="p-3 text-gray-400 hover:text-[#161615] dark:hover:text-slate-200 transition-colors rounded-2xl hover:bg-white/50 dark:hover:bg-slate-700/50"
      >
        <ArrowLeft size={24} />
      </button>
      <div>
        <h1 className="text-4xl md:text-5xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-2">
          {chainName}
        </h1>
        <p className="text-sm font-mono text-gray-500 tracking-wider uppercase">
          {tr('链条详情', 'CHAIN DETAILS')}
        </p>
      </div>
    </div>
    <div className="flex space-x-3">
      <button
        onClick={onEdit}
        className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg font-chinese"
      >
        <Edit size={16} />
        <span>{tr('编辑链条', 'Edit')}</span>
      </button>
      <button
        onClick={onDeleteClick}
        className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg font-chinese"
      >
        <Trash2 size={16} />
        <span>{tr('删除', 'Delete')}</span>
      </button>
    </div>
  </header>
);
