import { AlignLeft } from 'lucide-react';
import { SettingSection } from '../../SettingSection';
import type { ChainEditorFormModel } from '../hooks/useChainEditorForm';

interface TaskDescriptionSectionProps {
  form: ChainEditorFormModel;
}

export function TaskDescriptionSection({ form }: TaskDescriptionSectionProps) {
  return (
    <SettingSection title="任务描述" icon={<AlignLeft className="text-gray-500" size={20} />} description="详细描述任务内容和目标">
      <div className="bento-card animate-scale-in">
        <textarea
          id="task-description"
          name="taskDescription"
          value={form.description}
          onChange={(e) => form.setDescription(e.target.value)}
          placeholder="具体要做什么？例如：完成CS61A项目的第一部分"
          rows={4}
          className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-6 py-4 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 resize-none font-chinese leading-relaxed"
          required
        />
      </div>
    </SettingSection>
  );
}

