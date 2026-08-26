import type { TaskDirection, UnitChainType } from '../../../types';
import { Copy, Layers, Tag } from 'lucide-react';
import { SettingSection } from '../../SettingSection';
import type { ChainEditorFormModel } from '../hooks/useChainEditorForm';
import { useI18n } from '../../../i18n';

interface BasicInfoSectionProps {
  form: ChainEditorFormModel;
  isActiveSession?: boolean;
}

export function BasicInfoSection({
  form,
  isActiveSession = false,
}: BasicInfoSectionProps) {
  const { tr } = useI18n();

  return (
    <SettingSection
      title={tr('基础信息', 'Basic info')}
      icon={<Tag className="text-primary-500" size={20} />}
      description={tr(
        '设置链条的基本信息',
        'Set the basic details of this chain',
      )}
    >
      <div className="bento-card animate-scale-in">
        <div className="mb-4">
          <label
            htmlFor="chain-name"
            className="mb-2 block font-chinese text-lg font-semibold text-gray-900 dark:text-slate-100"
          >
            {tr('链名称', 'Chain name')}
          </label>
          <p className="mb-4 font-chinese text-sm text-gray-500 dark:text-slate-400">
            {tr(
              '为您的链条起一个清晰易懂的名称',
              'Give your chain a clear and recognizable name',
            )}
          </p>
        </div>
        <input
          type="text"
          id="chain-name"
          name="chainName"
          value={form.name}
          onChange={(e) => form.setName(e.target.value)}
          placeholder={tr(
            '例如：学习 Python、健身 30 分钟、无干扰写作',
            'e.g. Learn Python, Workout 30 minutes, Distraction-free writing',
          )}
          className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-6 py-4 font-chinese text-gray-900 placeholder-gray-400 transition duration-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
          required
        />
      </div>

      <div className="bento-card animate-scale-in">
        <div className="mb-4">
          <label
            htmlFor="chain-direction"
            className="mb-2 block font-chinese text-lg font-semibold text-gray-900 dark:text-slate-100"
          >
            {tr('任务方向', 'Task direction')}
          </label>
          <p className="mb-4 font-chinese text-sm text-gray-500 dark:text-slate-400">
            {tr(
              '周期向任务会持续保留；目标向任务可在完成项目后归档。创建后不可转换。',
              'Periodic tasks stay active; goal tasks can be archived when the project is complete. This cannot be changed after creation.',
            )}
          </p>
        </div>
        <select
          id="chain-direction"
          name="chainDirection"
          value={form.taskDirection}
          disabled={form.isDirectionLocked}
          onChange={(e) =>
            form.setTaskDirection(e.target.value as TaskDirection)
          }
          className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-4 font-chinese text-gray-900 transition duration-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="periodic">{tr('周期向任务', 'Periodic task')}</option>
          <option value="goal">{tr('目标向任务', 'Goal task')}</option>
        </select>
      </div>

      <div className="bento-card animate-scale-in">
        <div className="mb-4">
          <label
            htmlFor="chain-type"
            className="mb-2 block font-chinese text-lg font-semibold text-gray-900 dark:text-slate-100"
          >
            {tr('任务类型', 'Task type')}
          </label>
          <p className="mb-4 font-chinese text-sm text-gray-500 dark:text-slate-400">
            {tr('选择最适合的任务类型', 'Choose the most suitable task type')}
          </p>
        </div>
        <select
          id="chain-type"
          name="chainType"
          value={form.type}
          disabled={isActiveSession}
          onChange={(e) => form.setType(e.target.value as UnitChainType)}
          className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-4 font-chinese text-gray-900 transition duration-300 hover:border-primary-300 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-primary-400"
        >
          <option value="unit">{tr('基础单元', 'Unit')}</option>
          <option value="assault">
            {tr(
              '突击单元（学习、实验、论文）',
              'Assault (study, experiments, papers)',
            )}
          </option>
          <option value="recon">
            {tr(
              '侦查单元（信息搜集）',
              'Recon (research, information gathering)',
            )}
          </option>
          <option value="command">
            {tr('指挥单元（制定计划）', 'Command (planning, strategy)')}
          </option>
          <option value="special_ops">
            {tr('特勤单元（处理杂事）', 'Special ops (miscellaneous tasks)')}
          </option>
          <option value="engineering">
            {tr('工程单元（运动锻炼）', 'Engineering (exercise, training)')}
          </option>
          <option value="quartermaster">
            {tr('炊事单元（备餐做饭）', 'Quartermaster (cooking, meal prep)')}
          </option>
        </select>
      </div>

      {form.parentId && (
        <div className="bento-card animate-scale-in border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Layers className="text-blue-500" size={24} />
              <div>
                <h4 className="font-chinese text-lg font-bold text-gray-900 dark:text-slate-100">
                  {tr('任务群归属', 'Group membership')}
                </h4>
                <p className="font-chinese text-sm text-gray-600 dark:text-slate-400">
                  {tr(
                    '当前属于一个任务群',
                    'This task currently belongs to a group',
                  )}
                </p>
              </div>
            </div>
            {isActiveSession ? (
              <span className="font-chinese text-sm text-amber-700 dark:text-amber-300">
                {tr('计时期间不可调整归属', 'Locked while timing')}
              </span>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    form.setParentId(undefined);
                    form.setIsCopyMode(true);
                  }}
                  className="flex items-center space-x-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-indigo-500 shadow-sm transition-colors hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800"
                  title={tr(
                    '复制此任务并移出任务群（原任务保留）',
                    'Duplicate this task and remove it from the group (original stays)',
                  )}
                >
                  <Copy size={14} />
                  <span>{tr('复制出群', 'Copy out')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => form.setParentId(undefined)}
                  className="flex items-center space-x-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-red-500 shadow-sm transition-colors hover:text-red-600 dark:border-slate-700 dark:bg-slate-800"
                  title={tr(
                    '将此任务移出任务群',
                    'Remove this task from the group',
                  )}
                >
                  <Layers size={14} className="rotate-180" />
                  <span>{tr('移出', 'Remove')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </SettingSection>
  );
}
