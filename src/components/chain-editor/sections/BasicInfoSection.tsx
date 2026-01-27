import type { UnitChainType } from '../../../types';
import { Copy, Layers, Tag } from 'lucide-react';
import { SettingSection } from '../../SettingSection';
import type { ChainEditorFormModel } from '../hooks/useChainEditorForm';
import { useI18n } from '../../../i18n';

interface BasicInfoSectionProps {
  form: ChainEditorFormModel;
}

export function BasicInfoSection({ form }: BasicInfoSectionProps) {
  const { tr } = useI18n();

  return (
    <SettingSection
      title={tr('基础信息', 'Basic info')}
      icon={<Tag className="text-primary-500" size={20} />}
      description={tr('设置链条的基本信息', 'Set the basic details of this chain')}
    >
      <div className="bento-card animate-scale-in">
        <div className="mb-4">
          <label htmlFor="chain-name" className="block text-lg font-semibold font-chinese text-gray-900 dark:text-slate-100 mb-2">
            {tr('链名称', 'Chain name')}
          </label>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 font-chinese">
            {tr('为您的链条起一个清晰易懂的名称', 'Give your chain a clear and recognizable name')}
          </p>
        </div>
        <input
          type="text"
          id="chain-name"
          name="chainName"
          value={form.name}
          onChange={(e) => form.setName(e.target.value)}
          placeholder={tr('例如：学习 Python、健身 30 分钟、无干扰写作', 'e.g. Learn Python, Workout 30 minutes, Distraction-free writing')}
          className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-6 py-4 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition duration-300 font-chinese"
          required
        />
      </div>

      <div className="bento-card animate-scale-in">
        <div className="mb-4">
          <label htmlFor="chain-type" className="block text-lg font-semibold font-chinese text-gray-900 dark:text-slate-100 mb-2">
            {tr('任务类型', 'Task type')}
          </label>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 font-chinese">{tr('选择最适合的任务类型', 'Choose the most suitable task type')}</p>
        </div>
        <select
          id="chain-type"
          name="chainType"
          value={form.type}
          onChange={(e) => form.setType(e.target.value as UnitChainType)}
          className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-2xl px-6 py-4 text-gray-900 dark:text-slate-100 transition duration-300 hover:border-primary-300 dark:hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 font-chinese"
        >
          <option value="unit">{tr('基础单元', 'Unit')}</option>
          <option value="assault">{tr('突击单元（学习、实验、论文）', 'Assault (study, experiments, papers)')}</option>
          <option value="recon">{tr('侦查单元（信息搜集）', 'Recon (research, information gathering)')}</option>
          <option value="command">{tr('指挥单元（制定计划）', 'Command (planning, strategy)')}</option>
          <option value="special_ops">{tr('特勤单元（处理杂事）', 'Special ops (miscellaneous tasks)')}</option>
          <option value="engineering">{tr('工程单元（运动锻炼）', 'Engineering (exercise, training)')}</option>
          <option value="quartermaster">{tr('炊事单元（备餐做饭）', 'Quartermaster (cooking, meal prep)')}</option>
        </select>
      </div>

      {form.parentId && (
        <div className="bento-card border-l-4 border-l-blue-500 animate-scale-in bg-blue-50/50 dark:bg-blue-900/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Layers className="text-blue-500" size={24} />
              <div>
                <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">
                  {tr('任务群归属', 'Group membership')}
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-400 font-chinese">{tr('当前属于一个任务群', 'This task currently belongs to a group')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  form.setParentId(undefined);
                  form.setIsCopyMode(true);
                }}
                className="px-3 py-2 bg-white dark:bg-slate-800 text-indigo-500 hover:text-indigo-600 rounded-xl shadow-sm text-sm font-medium transition-colors border border-gray-200 dark:border-slate-700 flex items-center space-x-1"
                title={tr('复制此任务并移出任务群（原任务保留）', 'Duplicate this task and remove it from the group (original stays)')}
              >
                <Copy size={14} />
                <span>{tr('复制出群', 'Copy out')}</span>
              </button>
              <button
                type="button"
                onClick={() => form.setParentId(undefined)}
                className="px-3 py-2 bg-white dark:bg-slate-800 text-red-500 hover:text-red-600 rounded-xl shadow-sm text-sm font-medium transition-colors border border-gray-200 dark:border-slate-700 flex items-center space-x-1"
                title={tr('将此任务移出任务群', 'Remove this task from the group')}
              >
                <Layers size={14} className="rotate-180" />
                <span>{tr('移出', 'Remove')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingSection>
  );
}

