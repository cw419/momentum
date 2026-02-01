import React from 'react';
import { Tag } from 'lucide-react';

import { SettingSection } from '../SettingSection';

const ERROR_INPUT_BORDER_CLASSES = 'border-red-500 focus:border-red-500 focus:ring-red-500/20';

interface FormErrors {
  name?: string;
  description?: string;
}

interface BasicInfoSectionProps {
  name: string;
  description: string;
  errors: FormErrors;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  tr: (zh: string, en: string) => string;
}

const BasicInfoSectionComponent: React.FC<BasicInfoSectionProps> = ({
  name,
  description,
  errors,
  onNameChange,
  onDescriptionChange,
  tr,
}) => (
  <div data-testid="task-group-editor-basic-info">
    <SettingSection
      title={tr('基础信息', 'Basic info')}
      icon={<Tag className="text-primary-500" size={20} />}
      description={tr('设置任务群的基本信息', 'Set the basic information for this group')}
    >
      {/* Task Group Name */}
      <div className="bento-card animate-scale-in">
        <div className="mb-4">
          <label
            htmlFor="taskgroup-name"
            className="block text-lg font-semibold font-chinese text-gray-900 dark:text-slate-100 mb-2"
          >
            {tr('任务群名称', 'Group name')}
          </label>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 font-chinese">
            {tr('为您的任务群起一个清晰易懂的名称', 'Give your group a clear and recognizable name')}
          </p>
        </div>
        <input
          type="text"
          id="taskgroup-name"
          name="taskGroupName"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={tr('例如：期末复习计划、网站开发项目、健身训练计划', 'e.g. Finals study plan, Website project, Workout plan')}
          className={`w-full bg-gray-50 dark:bg-slate-700 border ${errors.name ? ERROR_INPUT_BORDER_CLASSES : 'border-gray-200 dark:border-slate-600 focus:border-primary-500 focus:ring-primary-500/20'} rounded-2xl px-6 py-4 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 transition duration-300 font-chinese`}
          required
        />
        {errors.name && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 font-chinese">{errors.name}</p>
        )}
      </div>

      {/* Task Group Description */}
      <div className="bento-card animate-scale-in">
        <div className="mb-4">
          <label
            htmlFor="taskgroup-description"
            className="block text-lg font-semibold font-chinese text-gray-900 dark:text-slate-100 mb-2"
          >
            {tr('任务群描述', 'Group description')}
          </label>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 font-chinese">
            {tr('详细描述这个任务群的目标和范围', 'Describe the goal and scope of this group')}
          </p>
        </div>
        <textarea
          id="taskgroup-description"
          name="taskGroupDescription"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={tr(
            '描述这个任务群的目标和范围，例如：期末复习计划，包含各科目的复习、练习题和模拟考试等',
            'Describe the goal and scope, e.g. Finals study plan with review, practice problems, and mock exams.'
          )}
          rows={4}
          className={`w-full bg-gray-50 dark:bg-slate-700 border ${errors.description ? ERROR_INPUT_BORDER_CLASSES : 'border-gray-200 dark:border-slate-600 focus:border-primary-500 focus:ring-primary-500/20'} rounded-2xl px-6 py-4 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 transition duration-300 resize-none font-chinese leading-relaxed`}
          required
        />
        {errors.description && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 font-chinese">{errors.description}</p>
        )}
      </div>
    </SettingSection>
  </div>
);

export const BasicInfoSection = React.memo(BasicInfoSectionComponent);

BasicInfoSection.displayName = 'BasicInfoSection';

