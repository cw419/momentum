import React from 'react';
import { Flame, Calendar } from 'lucide-react';
import { MainStatsProps, StatRowProps } from './types';
import { formatTime } from '../../utils/time';
import { getAuxiliarySignalLabel, getTriggerLabel } from '../chain-editor/constants';

const StatRow: React.FC<StatRowProps> = ({ label, value, mono, success, danger, blue }) => {
  let valueClass = 'text-[#161615] dark:text-slate-100 font-medium';
  if (success) valueClass = 'text-green-500 font-bold';
  if (danger) valueClass = 'text-red-500 font-bold';
  if (blue) valueClass = 'text-blue-500 font-medium';
  if (mono) valueClass += ' font-mono';
  if (!mono && !success && !danger && !blue) valueClass += ' font-chinese';

  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500 dark:text-slate-400 font-chinese">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
};

export const ChainDetailStats: React.FC<MainStatsProps> = ({
  chain,
  successRate,
  language,
  tr,
}) => (
  <div className="bento-card animate-scale-in">
    <div className="text-center mb-8">
      <div className="flex items-center justify-center space-x-3 text-primary-500 mb-4">
        <div className="w-16 h-16 rounded-3xl bg-primary-500/10 flex items-center justify-center">
          <Flame size={32} />
        </div>
        <div className="text-left">
          <span className="text-5xl font-bold font-mono">#{chain.currentStreak}</span>
          <p className="text-gray-500 text-sm font-chinese">{tr('主链当前记录', 'Main streak')}</p>
        </div>
      </div>
    </div>

    <div className="text-center mb-8 pb-8 border-b border-gray-200">
      <div className="flex items-center justify-center space-x-3 text-blue-500 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
          <Calendar size={24} />
        </div>
        <div className="text-left">
          <span className="text-3xl font-bold font-mono">#{chain.auxiliaryStreak}</span>
          <p className="text-gray-500 text-sm font-chinese">{tr('预约链当前记录', 'Booking streak')}</p>
        </div>
      </div>
    </div>

    <div className="space-y-4">
      <StatRow label={tr('触发动作', 'Trigger')} value={getTriggerLabel(chain.trigger, language)} />
      <StatRow label={tr('任务时长', 'Duration')} value={formatTime(chain.duration, language)} mono />
      <StatRow label={tr('总完成次数', 'Total completions')} value={chain.totalCompletions} mono success />
      <StatRow label={tr('失败次数', 'Failures')} value={chain.totalFailures} mono danger />
      <StatRow label={tr('预约链失败', 'Booking failures')} value={chain.auxiliaryFailures} mono danger />
      <StatRow label={tr('预约信号', 'Booking signal')} value={getAuxiliarySignalLabel(chain.auxiliarySignal, language)} blue />
      <StatRow label={tr('预约时长', 'Booking duration')} value={tr(`${chain.auxiliaryDuration}分钟`, `${chain.auxiliaryDuration} min`)} mono blue />
      <StatRow label={tr('预约完成条件', 'Booking completion trigger')} value={getTriggerLabel(chain.auxiliaryCompletionTrigger, language)} blue />
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <span className="text-gray-500 dark:text-slate-400 font-chinese">{tr('成功率', 'Success rate')}</span>
        <span className="text-primary-500 font-bold text-xl font-mono">{successRate}%</span>
      </div>
    </div>
  </div>
);
