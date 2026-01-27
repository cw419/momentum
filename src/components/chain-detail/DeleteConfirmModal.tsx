import React from 'react';
import { Trash2, Flame, Calendar, Clock, AlertCircle } from 'lucide-react';
import { DeleteConfirmModalProps, DeleteDataSummaryProps, DeleteDataCardProps } from './types';

const DeleteDataCard: React.FC<DeleteDataCardProps> = ({ icon, title, items }) => (
  <div className="bg-white/80 dark:bg-slate-700/50 rounded-xl p-4 border border-red-200/60 dark:border-red-800/40">
    <div className="font-semibold mb-3 flex items-center font-chinese">
      <div className="w-6 h-6 rounded-lg bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center mr-2">
        {icon}
      </div>
      {title}
    </div>
    <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
      {items.map((item, index) => (
        <div key={index} className={item.isChinese ? 'font-chinese' : 'font-mono'}>
          {item.label}{item.value}
        </div>
      ))}
    </div>
  </div>
);

const DeleteDataSummary: React.FC<DeleteDataSummaryProps> = ({
  chain,
  chainHistoryCount,
  successRate,
  language,
  tr,
}) => (
  <div className="bg-red-50/80 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200/60 dark:border-red-800/40 mb-8">
    <div className="text-center mb-6">
      <p className="text-red-600 dark:text-red-400 text-sm font-medium font-chinese">
        {tr('此操作将永久删除以下数据：', 'This will permanently delete:')}
      </p>
    </div>
    <div className="grid grid-cols-2 gap-4 text-red-600 dark:text-red-400 text-sm">
      <DeleteDataCard
        icon={<Flame size={16} />}
        title={tr('主链数据', 'Main chain')}
        items={[
          { label: tr('记录: ', 'Streak: '), value: `#${chain.currentStreak}` },
          { label: tr('完成: ', 'Completions: '), value: chain.totalCompletions },
          { label: tr('失败: ', 'Failures: '), value: chain.totalFailures },
        ]}
      />
      <DeleteDataCard
        icon={<Calendar size={16} />}
        title={tr('预约链数据', 'Booking')}
        items={[
          { label: tr('记录: ', 'Streak: '), value: `#${chain.auxiliaryStreak}` },
          { label: tr('失败: ', 'Failures: '), value: chain.auxiliaryFailures },
          { label: tr('例外: ', 'Exceptions: '), value: `${chain.auxiliaryExceptions?.length || 0}${language === 'zh' ? ' 条' : ''}` },
        ]}
      />
    </div>
    <div className="grid grid-cols-2 gap-4 text-red-600 dark:text-red-400 text-sm mt-4">
      <DeleteDataCard
        icon={<Clock size={16} />}
        title={tr('历史记录', 'History')}
        items={[
          { label: tr('记录: ', 'Records: '), value: `${chainHistoryCount}${language === 'zh' ? ' 条' : ''}` },
          { label: tr('成功率: ', 'Success rate: '), value: `${successRate}%` },
          { label: '', value: tr('时间统计', 'Time stats'), isChinese: true },
        ]}
      />
      <DeleteDataCard
        icon={<AlertCircle size={16} />}
        title={tr('规则设置', 'Rules')}
        items={[
          { label: tr('例外: ', 'Exceptions: '), value: `${chain.exceptions.length}${language === 'zh' ? ' 条' : ''}` },
          { label: tr('预约例外: ', 'Booking exceptions: '), value: `${chain.auxiliaryExceptions?.length || 0}${language === 'zh' ? ' 条' : ''}` },
          { label: '', value: tr('所有配置', 'All settings'), isChinese: true },
        ]}
      />
    </div>
  </div>
);

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  chain,
  chainHistoryCount,
  successRate,
  language,
  tr,
  onConfirm,
  onCancel,
}) => (
  <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
    <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full border border-gray-200/60 dark:border-slate-600/60 shadow-2xl animate-scale-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-6">
          <Trash2 className="text-red-500" size={32} />
        </div>
        <h3 className="text-2xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-3">
          {tr('确认删除链条', 'Delete chain?')}
        </h3>
        <p className="text-gray-600 dark:text-slate-300 mb-6 font-chinese">
          {tr('你确定要删除链条 "', 'Are you sure you want to delete the chain "')}
          <span className="text-primary-500 font-semibold">{chain.name}</span>
          {tr('" 吗？', '"?')}
        </p>
      </div>

      <DeleteDataSummary
        chain={chain}
        chainHistoryCount={chainHistoryCount}
        successRate={successRate}
        language={language}
        tr={tr}
      />

      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-6 py-4 rounded-2xl font-medium transition duration-300 hover:scale-105 font-chinese"
        >
          {tr('取消', 'Cancel')}
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-2xl font-medium transition duration-300 hover:scale-105 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl font-chinese"
        >
          <Trash2 size={16} />
          <span>{tr('确认删除', 'Delete')}</span>
        </button>
      </div>
    </div>
  </div>
);
