import type { UnitChainType } from '../../../types';
import { Copy, Layers, Tag } from 'lucide-react';
import { SettingSection } from '../../SettingSection';
import type { ChainEditorFormModel } from '../hooks/useChainEditorForm';

interface BasicInfoSectionProps {
  form: ChainEditorFormModel;
}

export function BasicInfoSection({ form }: BasicInfoSectionProps) {
  return (
    <SettingSection title="基础信息" icon={<Tag className="text-primary-500" size={20} />} description="设置链条的基本信息">
      <div className="bento-card animate-scale-in">
        <div className="mb-4">
          <label htmlFor="chain-name" className="block text-lg font-semibold font-chinese text-gray-900 dark:text-slate-100 mb-2">
            链名称
          </label>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 font-chinese">为您的链条起一个清晰易懂的名称</p>
        </div>
        <input
          type="text"
          id="chain-name"
          name="chainName"
          value={form.name}
          onChange={(e) => form.setName(e.target.value)}
          placeholder="例如：学习Python、健身30分钟、无干扰写作"
          className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-6 py-4 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
          required
        />
      </div>

      <div className="bento-card animate-scale-in">
        <div className="mb-4">
          <label htmlFor="chain-type" className="block text-lg font-semibold font-chinese text-gray-900 dark:text-slate-100 mb-2">
            任务类型
          </label>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 font-chinese">选择最适合的任务类型</p>
        </div>
        <select
          id="chain-type"
          name="chainType"
          value={form.type}
          onChange={(e) => form.setType(e.target.value as UnitChainType)}
          className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-2xl px-6 py-4 text-gray-900 dark:text-slate-100 transition-all duration-300 hover:border-primary-300 dark:hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 font-chinese"
        >
          <option value="unit">基础单元</option>
          <option value="assault">突击单元（学习、实验、论文）</option>
          <option value="recon">侦查单元（信息搜集）</option>
          <option value="command">指挥单元（制定计划）</option>
          <option value="special_ops">特勤单元（处理杂事）</option>
          <option value="engineering">工程单元（运动锻炼）</option>
          <option value="quartermaster">炊事单元（备餐做饭）</option>
        </select>
      </div>

      {form.parentId && (
        <div className="bento-card border-l-4 border-l-blue-500 animate-scale-in bg-blue-50/50 dark:bg-blue-900/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Layers className="text-blue-500" size={24} />
              <div>
                <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">任务群归属</h4>
                <p className="text-sm text-gray-600 dark:text-slate-400 font-chinese">当前属于一个任务群</p>
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
                title="复制此任务并移出任务群（原任务保留）"
              >
                <Copy size={14} />
                <span>复制出群</span>
              </button>
              <button
                type="button"
                onClick={() => form.setParentId(undefined)}
                className="px-3 py-2 bg-white dark:bg-slate-800 text-red-500 hover:text-red-600 rounded-xl shadow-sm text-sm font-medium transition-colors border border-gray-200 dark:border-slate-700 flex items-center space-x-1"
                title="将此任务移出任务群"
              >
                <Layers size={14} className="rotate-180" />
                <span>移出</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingSection>
  );
}

