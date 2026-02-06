import React from 'react';
import {
  AlertTriangle,
  Clock,
  Hash,
  Import,
  Pencil,
  Play,
  Plus,
  Target,
  Users,
} from 'lucide-react';
import { ImportUnitsModal } from '../ImportUnitsModal';
import { BackButton } from '../BackButton';
import { Icon } from '../../utils/iconMap';
import { UnitCard } from './UnitCard';
import { RepeatCountModal } from './RepeatCountModal';
import type { GroupViewViewProps } from './types';

function getProgressBarColor(progress: number) {
  if (progress > 0.8) return 'bg-red-500';
  if (progress > 0.6) return 'bg-orange-500';
  return 'bg-green-500';
}

export const GroupViewView: React.FC<GroupViewViewProps> = ({
  group,
  availableUnits,
  onBack,
  onStartChain,
  onScheduleChain,
  onEditChain,
  onDeleteChain,
  onAddUnit,
  onImportUnits,
  onReorderUnit,
  onViewDetail,
  getScheduledSession,
  language,
  tr,
  progress,
  unitProgress,
  nextUnit,
  typeConfig,
  timeStatus,
  showImportModal,
  setShowImportModal,
  showRepeatModal,
  setShowRepeatModal,
  repeatCount,
  setRepeatCount,
  handleOpenRepeatModal,
  handleUpdateRepeatCount,
}) => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-12 animate-fade-in">
          <div className="flex items-center space-x-4">
            <BackButton
              onClick={onBack}
              label={tr('返回', 'Back')}
              className="p-3 text-gray-400 hover:text-[#161615] dark:hover:text-slate-200 transition-colors rounded-2xl hover:bg-white/50 dark:hover:bg-slate-700/50"
            />
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 rounded-3xl ${typeConfig.bgColor} flex items-center justify-center`}>
                <Icon name={typeConfig.icon} size={24} className={typeConfig.color} />
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-4xl md:text-5xl font-bold font-chinese text-[#161615] dark:text-slate-100">{group.name}</h1>
                  {group.totalCompletions > 0 && (
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-2xl shadow-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold">#{group.totalCompletions}</span>
                        <span className="text-sm">{tr('轮', 'cycles')}</span>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm font-mono text-gray-500 tracking-wider uppercase">
                  {typeConfig.name} · {unitProgress.completed}/{unitProgress.total} {tr('已完成', 'completed')}
                  {group.totalCompletions > 0 && (
                    <span className="ml-2 text-amber-600 dark:text-amber-400">
                      {language === 'zh' ? `🔄 第${group.totalCompletions + 1}轮进行中` : `🔄 Cycle ${group.totalCompletions + 1} in progress`}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onAddUnit}
              className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-4 py-3 rounded-2xl font-medium transition duration-300 flex items-center space-x-2 hover:scale-105 font-chinese"
            >
              <Plus size={16} />
              <span>{tr('添加单元', 'Add unit')}</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-2xl font-medium transition duration-300 flex items-center space-x-2 hover:scale-105 font-chinese"
            >
              <Import size={16} />
              <span>{tr('导入单元', 'Import units')}</span>
            </button>

            <button
              onClick={() => onEditChain(group.id)}
              className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-4 py-3 rounded-2xl font-medium transition duration-300 flex items-center space-x-2 hover:scale-105 font-chinese"
              title={tr('编辑任务群', 'Edit group')}
            >
              <Pencil size={16} />
              <span>{tr('编辑任务群', 'Edit group')}</span>
            </button>

            <button
              onClick={() => onStartChain(group.id)}
              className="gradient-primary hover:shadow-xl text-white px-6 py-3 rounded-2xl font-medium transition duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg font-chinese"
            >
              <Play size={16} />
              <span>{nextUnit ? tr('开始下一个', 'Start next') : tr('开始新一轮', 'Start new cycle')}</span>
            </button>
          </div>
        </header>

        <div className="bento-card mb-8 animate-scale-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100">{tr('任务群概览', 'Group overview')}</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-slate-400">
              <div className="flex items-center space-x-2">
                <Users size={16} />
                <span>{tr(`${group.children.length} 个单元`, `${group.children.length} units`)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Target size={16} />
                <span>
                  {unitProgress.completed}/{unitProgress.total} {tr('已完成', 'completed')}
                </span>
              </div>
              {group.totalCompletions > 0 && (
                <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-medium">
                  <Hash size={16} />
                  <span>{language === 'zh' ? `已完成 ${group.totalCompletions} 轮` : `Completed ${group.totalCompletions} cycles`}</span>
                </div>
              )}
              {progress.total !== unitProgress.total && (
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-slate-500">
                  <span>
                    {language === 'zh' ? `(${progress.completed}/${progress.total} 重复次数)` : `(${progress.completed}/${progress.total} repeats)`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-4 mb-4">
            <div
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-4 rounded-full transition-[width] duration-500 flex items-center justify-end pr-2"
              style={{ width: `${unitProgress.total > 0 ? (unitProgress.completed / unitProgress.total) * 100 : 0}%` }}
            >
              {unitProgress.completed > 0 && (
                <span className="text-white text-xs font-bold">{Math.round((unitProgress.completed / unitProgress.total) * 100)}%</span>
              )}
            </div>
          </div>

          <p className="text-gray-700 dark:text-slate-300 leading-relaxed font-chinese">{group.description}</p>

          {group.timeLimitHours && (
            <div
              className={`mt-6 p-4 rounded-2xl border-l-4 ${
                timeStatus.isExpired ? 'bg-red-50 dark:bg-red-900/20 border-red-500' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock size={18} className={timeStatus.isExpired ? 'text-red-500' : 'text-orange-500'} />
                  <div>
                    <h4
                      className={`font-bold font-chinese ${
                        timeStatus.isExpired ? 'text-red-700 dark:text-red-300' : 'text-orange-700 dark:text-orange-300'
                      }`}
                    >
                      {timeStatus.isExpired ? tr('任务群已超时', 'Time expired') : tr('时间限制', 'Time limit')}
                    </h4>
                    <p
                      className={`text-sm ${
                        timeStatus.isExpired ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
                      }`}
                    >
                      {timeStatus.formattedTime}
                    </p>
                  </div>
                </div>

                {!timeStatus.isExpired && (
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-[width,background-color] duration-300 ${getProgressBarColor(timeStatus.progress)}`}
                        style={{ width: `${timeStatus.progress * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-slate-400">{Math.round(timeStatus.progress * 100)}%</span>
                  </div>
                )}
              </div>

              {timeStatus.isExpired && (
                <div className="mt-3 text-sm text-red-600 dark:text-red-400 font-chinese flex items-center">
                  <AlertTriangle size={14} className="mr-2" />
                  {tr('任务群已超时，进度将被清空。请重新开始任务群。', 'This group has expired. Progress will be cleared. Please restart the group.')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100">{tr('任务单元', 'Units')}</h2>
            {nextUnit && (
              <p className="text-sm text-gray-600 dark:text-slate-400 font-chinese">
                {tr('下一个待执行：', 'Next up: ')}
                <span className="text-primary-500 font-semibold">{nextUnit.name}</span>
              </p>
            )}
          </div>

          {group.children.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-slate-400">
              <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-6">
                <Users size={32} className="text-gray-400" />
              </div>
              <p className="font-chinese text-lg mb-4">{tr('此任务群还没有子单元', 'This group has no units yet')}</p>
              <button
                onClick={onAddUnit}
                className="gradient-primary hover:shadow-xl text-white px-6 py-3 rounded-2xl font-medium transition duration-300 flex items-center space-x-2 mx-auto hover:scale-105 shadow-lg font-chinese"
              >
                <Plus size={16} />
                <span>{tr('添加第一个单元', 'Add your first unit')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {group.children.map((unit, index) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  index={index}
                  group={group}
                  scheduledSession={getScheduledSession(unit.id)}
                  nextUnit={nextUnit || undefined}
                  language={language}
                  tr={tr}
                  onStartChain={onStartChain}
                  onScheduleChain={onScheduleChain}
                  onEditChain={onEditChain}
                  onDeleteChain={onDeleteChain}
                  onReorderUnit={onReorderUnit}
                  onOpenRepeatModal={handleOpenRepeatModal}
                  onViewDetail={onViewDetail}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showImportModal && (
        <ImportUnitsModal
          availableUnits={availableUnits}
          groupId={group.id}
          onImport={onImportUnits}
          onClose={() => setShowImportModal(false)}
        />
      )}

      <RepeatCountModal
        isOpen={showRepeatModal}
        tr={tr}
        repeatCount={repeatCount}
        setRepeatCount={setRepeatCount}
        onClose={() => setShowRepeatModal(false)}
        onSave={handleUpdateRepeatCount}
      />
    </div>
  );
};
