import { Import, Pencil, Play, Plus } from 'lucide-react';
import { BackButton } from '../BackButton';
import { Icon } from '../../utils/iconMap';
import type { GroupViewViewProps } from './types';

type Props = Pick<
  GroupViewViewProps,
  | 'group'
  | 'onBack'
  | 'onAddUnit'
  | 'onEditChain'
  | 'onStartChain'
  | 'setShowImportModal'
  | 'language'
  | 'tr'
  | 'unitProgress'
  | 'nextUnit'
  | 'typeConfig'
>;

export function GroupViewHeader(props: Props) {
  return (
    <header className="mb-12 flex animate-fade-in items-center justify-between">
      <div className="flex items-center space-x-4">
        <BackButton
          onClick={props.onBack}
          label={props.tr('返回', 'Back')}
          className="rounded-2xl p-3 text-gray-400 transition-colors hover:bg-white/50 hover:text-[#161615] dark:hover:bg-slate-700/50 dark:hover:text-slate-200"
        />
        <div className="flex items-center space-x-4">
          <div
            className={`h-16 w-16 rounded-3xl ${props.typeConfig.bgColor} flex items-center justify-center`}
          >
            <Icon
              name={props.typeConfig.icon}
              size={24}
              className={props.typeConfig.color}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center space-x-3">
              <h1 className="font-chinese text-4xl font-bold text-[#161615] dark:text-slate-100 md:text-5xl">
                {props.group.name}
              </h1>
              {props.group.totalCompletions > 0 && (
                <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-white shadow-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold">
                      #{props.group.totalCompletions}
                    </span>
                    <span className="text-sm">{props.tr('轮', 'cycles')}</span>
                  </div>
                </div>
              )}
            </div>
            <p className="font-mono text-sm uppercase tracking-wider text-gray-500">
              {props.typeConfig.name} · {props.unitProgress.completed}/
              {props.unitProgress.total} {props.tr('已完成', 'completed')}
              {props.group.totalCompletions > 0 && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">
                  {props.language === 'zh'
                    ? `🔄 第${props.group.totalCompletions + 1}轮进行中`
                    : `🔄 Cycle ${props.group.totalCompletions + 1} in progress`}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <button
          onClick={props.onAddUnit}
          className="flex items-center space-x-2 rounded-2xl bg-gray-100 px-4 py-3 font-chinese font-medium text-gray-700 transition duration-300 hover:scale-105 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          <Plus size={16} />
          <span>{props.tr('添加单元', 'Add unit')}</span>
        </button>
        <button
          onClick={() => props.setShowImportModal(true)}
          className="flex items-center space-x-2 rounded-2xl bg-blue-100 px-4 py-3 font-chinese font-medium text-blue-700 transition duration-300 hover:scale-105 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
        >
          <Import size={16} />
          <span>{props.tr('导入单元', 'Import units')}</span>
        </button>
        <button
          onClick={() => props.onEditChain(props.group.id)}
          className="flex items-center space-x-2 rounded-2xl bg-gray-100 px-4 py-3 font-chinese font-medium text-gray-700 transition duration-300 hover:scale-105 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          title={props.tr('编辑任务群', 'Edit group')}
        >
          <Pencil size={16} />
          <span>{props.tr('编辑任务群', 'Edit group')}</span>
        </button>
        <button
          onClick={() => props.onStartChain(props.group.id)}
          className="gradient-primary flex items-center space-x-2 rounded-2xl px-6 py-3 font-chinese font-medium text-white shadow-lg transition duration-300 hover:scale-105 hover:shadow-xl"
        >
          <Play size={16} />
          <span>
            {props.nextUnit
              ? props.tr('开始下一个', 'Start next')
              : props.tr('开始新一轮', 'Start new cycle')}
          </span>
        </button>
      </div>
    </header>
  );
}
