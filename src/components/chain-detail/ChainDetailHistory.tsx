import React from 'react';
import { Calendar, CheckCircle, XCircle, Clock, ListTodo, StickyNote } from 'lucide-react';
import { HistorySectionProps, HistoryRecordProps, TranslationFn } from './types';
import { formatTime, formatActualDuration } from '../../utils/time';

const EmptyHistory: React.FC<{ tr: TranslationFn }> = ({ tr }) => (
  <div className="text-center py-16 text-gray-500 dark:text-slate-400">
    <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
      <Calendar size={32} className="text-gray-400" />
    </div>
    <p className="font-chinese text-lg">{tr('还没有完成记录', 'No completion records yet')}</p>
    <p className="text-sm font-mono text-gray-400 dark:text-slate-500 mt-2">
      {tr('暂无记录', 'NO COMPLETION RECORDS YET')}
    </p>
  </div>
);

const HistoryRecord: React.FC<HistoryRecordProps> = ({
  record,
  locale,
  language,
  tr,
  formatFailureReason,
}) => (
  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-6 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            record.wasSuccessful ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
          }`}
        >
          {record.wasSuccessful ? <CheckCircle size={24} /> : <XCircle size={24} />}
        </div>
        <div>
          <p className="text-[#161615] dark:text-slate-100 font-medium font-chinese text-lg">
            {record.wasSuccessful ? tr('任务完成', 'Completed') : tr('任务失败', 'Failed')}
          </p>
          {!record.wasSuccessful && record.reasonForFailure && (
            <p className="text-red-500 dark:text-red-400 text-sm font-chinese mt-1">
              {formatFailureReason(record.reasonForFailure)}
            </p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-gray-500 dark:text-slate-400 text-sm font-mono mb-1">
          {new Intl.DateTimeFormat(locale).format(record.completedAt)}
        </p>
        <div className="flex items-center space-x-2 text-gray-400 dark:text-slate-500 text-sm">
          <Clock size={14} />
          <span className="font-mono">
            {record.actualDuration
              ? formatActualDuration(record.actualDuration, record.isForwardTimed, language)
              : formatTime(record.duration, language)}
          </span>
        </div>
      </div>
    </div>

    {(record.description || record.notes) && (
      <HistoryRecordDetails record={record} tr={tr} />
    )}
  </div>
);

const HistoryRecordDetails: React.FC<{
  record: HistoryRecordProps['record'];
  tr: TranslationFn;
}> = ({ record, tr }) => (
  <div className="space-y-3">
    {record.description && (
      <div className="bg-white dark:bg-slate-600/30 rounded-xl p-4 border border-gray-200/50 dark:border-slate-500/30">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
            <ListTodo className="text-blue-500" size={14} />
          </div>
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 font-chinese">
            {tr('任务描述', 'Task description')}
          </span>
        </div>
        <p className="text-gray-700 dark:text-slate-200 text-sm font-chinese leading-relaxed">
          {record.description}
        </p>
      </div>
    )}

    {record.notes && (
      <div className="bg-white dark:bg-slate-600/30 rounded-xl p-4 border border-gray-200/50 dark:border-slate-500/30">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
            <StickyNote className="text-amber-500" size={14} />
          </div>
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 font-chinese">
            {tr('备注', 'Notes')}
          </span>
        </div>
        <p className="text-gray-700 dark:text-slate-200 text-sm font-chinese leading-relaxed">
          {record.notes}
        </p>
      </div>
    )}
  </div>
);

export const ChainDetailHistory: React.FC<HistorySectionProps> = ({
  recentHistory,
  locale,
  language,
  tr,
  formatFailureReason,
}) => (
  <div className="bento-card animate-scale-in">
    <h3 className="text-xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-6 flex items-center space-x-3">
      <div className="w-10 h-10 rounded-2xl bg-primary-500/10 flex items-center justify-center">
        <Calendar size={20} className="text-primary-500" />
      </div>
      <div>
        <span>{tr('最近记录', 'Recent history')}</span>
        <p className="text-xs font-mono text-gray-500 dark:text-slate-400 tracking-wide">
          {tr('最近记录', 'RECENT HISTORY')}
        </p>
      </div>
    </h3>

    {recentHistory.length === 0 ? (
      <EmptyHistory tr={tr} />
    ) : (
      <div className="space-y-4">
        {recentHistory.map((record, index) => (
          <HistoryRecord
            key={index}
            record={record}
            locale={locale}
            language={language}
            tr={tr}
            formatFailureReason={formatFailureReason}
          />
        ))}
      </div>
    )}
  </div>
);
