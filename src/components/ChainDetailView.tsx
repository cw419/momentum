import React from 'react';
import { Chain, CompletionHistory } from '../types';
import {
  ArrowLeft,
  Flame,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  AlertCircle,
  Trash2,
  Edit,
  AlignLeft,
  ListTodo,
  StickyNote,
} from 'lucide-react';
import { formatTime, formatActualDuration } from '../utils/time';
import { getAuxiliarySignalLabel, getTriggerLabel } from './chain-editor/constants';

export interface ChainDetailViewProps {
  chain: Chain;
  recentHistory: CompletionHistory[];
  chainHistoryCount: number;
  successRate: number;
  showDeleteConfirm: boolean;
  language: 'zh' | 'en';
  locale: string;
  tr: (zh: string, en: string) => string;
  formatFailureReason: (reason: string) => string;
  onBack: () => void;
  onEdit: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

const ChainDetailViewComponent: React.FC<ChainDetailViewProps> = ({
  chain,
  recentHistory,
  chainHistoryCount,
  successRate,
  showDeleteConfirm,
  language,
  locale,
  tr,
  formatFailureReason,
  onBack,
  onEdit,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}) => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <Header
          chainName={chain.name}
          tr={tr}
          onBack={onBack}
          onEdit={onEdit}
          onDeleteClick={onDeleteClick}
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-1 space-y-6">
            <MainStats
              chain={chain}
              successRate={successRate}
              language={language}
              tr={tr}
            />

            <ExceptionsSection chain={chain} tr={tr} />
          </div>

          <div className="xl:col-span-2 space-y-6">
            <DescriptionSection description={chain.description} tr={tr} />

            <HistorySection
              recentHistory={recentHistory}
              locale={locale}
              language={language}
              tr={tr}
              formatFailureReason={formatFailureReason}
            />
          </div>
        </div>

        {showDeleteConfirm && (
          <DeleteConfirmModal
            chain={chain}
            chainHistoryCount={chainHistoryCount}
            successRate={successRate}
            language={language}
            tr={tr}
            onConfirm={onDeleteConfirm}
            onCancel={onDeleteCancel}
          />
        )}
      </div>
    </div>
  );
};

interface HeaderProps {
  chainName: string;
  tr: (zh: string, en: string) => string;
  onBack: () => void;
  onEdit: () => void;
  onDeleteClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ chainName, tr, onBack, onEdit, onDeleteClick }) => (
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

interface MainStatsProps {
  chain: Chain;
  successRate: number;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
}

const MainStats: React.FC<MainStatsProps> = ({ chain, successRate, language, tr }) => (
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

interface StatRowProps {
  label: string;
  value: string | number;
  mono?: boolean;
  success?: boolean;
  danger?: boolean;
  blue?: boolean;
}

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

interface ExceptionsSectionProps {
  chain: Chain;
  tr: (zh: string, en: string) => string;
}

const ExceptionsSection: React.FC<ExceptionsSectionProps> = ({ chain, tr }) => {
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

interface DescriptionSectionProps {
  description: string;
  tr: (zh: string, en: string) => string;
}

const DescriptionSection: React.FC<DescriptionSectionProps> = ({ description, tr }) => (
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

interface HistorySectionProps {
  recentHistory: CompletionHistory[];
  locale: string;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
  formatFailureReason: (reason: string) => string;
}

const HistorySection: React.FC<HistorySectionProps> = ({
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

const EmptyHistory: React.FC<{ tr: (zh: string, en: string) => string }> = ({ tr }) => (
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

interface HistoryRecordProps {
  record: CompletionHistory;
  locale: string;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
  formatFailureReason: (reason: string) => string;
}

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
    )}
  </div>
);

interface DeleteConfirmModalProps {
  chain: Chain;
  chainHistoryCount: number;
  successRate: number;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
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
          className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-6 py-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105 font-chinese"
        >
          {tr('取消', 'Cancel')}
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl font-chinese"
        >
          <Trash2 size={16} />
          <span>{tr('确认删除', 'Delete')}</span>
        </button>
      </div>
    </div>
  </div>
);

interface DeleteDataSummaryProps {
  chain: Chain;
  chainHistoryCount: number;
  successRate: number;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
}

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

interface DeleteDataCardProps {
  icon: React.ReactNode;
  title: string;
  items: Array<{ label: string; value: string | number; isChinese?: boolean }>;
}

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

export const ChainDetailView = React.memo(ChainDetailViewComponent);
