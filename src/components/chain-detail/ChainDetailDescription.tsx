import React from 'react';
import { AlignLeft } from 'lucide-react';
import { DescriptionSectionProps } from './types';

export const ChainDetailDescription: React.FC<DescriptionSectionProps> = ({ description, tr }) => (
  <div className="bento-card animate-scale-in">
    <h3 className="text-xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-6 flex items-center space-x-3">
      <div className="w-10 h-10 rounded-2xl bg-gray-500/10 flex items-center justify-center">
        <AlignLeft className="text-gray-500" size={20} />
      </div>
      <div>
        <span>{tr('任务描述', 'Task description')}</span>
        <p className="text-xs font-mono text-gray-500 dark:text-slate-400 tracking-wide">
          {tr('任务描述', 'TASK DESCRIPTION')}
        </p>
      </div>
    </h3>
    <p className="text-gray-700 dark:text-slate-300 leading-relaxed font-chinese text-lg">{description}</p>
  </div>
);
