import React from 'react';
import { AlertCircle, Flame, Calendar } from 'lucide-react';
import { ExceptionsSectionProps } from './types';

export const ChainDetailExceptions: React.FC<ExceptionsSectionProps> = ({ chain, tr }) => {
  if (chain.exceptions.length === 0 && chain.auxiliaryExceptions.length === 0) {
    return null;
  }

  return (
    <div className="bento-card animate-scale-in">
      <h3 className="text-xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-6 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
          <AlertCircle size={20} className="text-yellow-500" />
        </div>
        <div>
          <span>{tr('规则手册', 'Rule handbook')}</span>
          <p className="text-xs font-mono text-gray-500 dark:text-slate-400 tracking-wide">
            {tr('规则手册', 'RULE HANDBOOK')}
          </p>
        </div>
      </h3>

      {chain.exceptions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-[#161615] dark:text-slate-100 font-medium mb-3 font-chinese flex items-center space-x-2">
            <Flame className="text-primary-500" size={20} />
            <span>{tr('主链例外规则：', 'Main chain exceptions:')}</span>
          </h4>
          <div className="space-y-3">
            {chain.exceptions.map((exception, index) => (
              <div key={index} className="bg-yellow-500/10 dark:bg-yellow-500/20 rounded-2xl p-4 border border-yellow-500/20 dark:border-yellow-500/30">
                <p className="text-yellow-700 dark:text-yellow-300 text-sm font-chinese">{exception}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {chain.auxiliaryExceptions.length > 0 && (
        <div>
          <h4 className="text-[#161615] dark:text-slate-100 font-medium mb-3 font-chinese flex items-center space-x-2">
            <Calendar className="text-blue-500" size={20} />
            <span>{tr('预约链例外规则：', 'Booking exceptions:')}</span>
          </h4>
          <div className="space-y-3">
            {chain.auxiliaryExceptions.map((exception, index) => (
              <div key={index} className="bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl p-4 border border-blue-500/20 dark:border-blue-500/30">
                <p className="text-blue-700 dark:text-blue-300 text-sm font-chinese">{exception}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
