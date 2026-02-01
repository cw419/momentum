import React from 'react';
import { Chain } from '../types';
import { Save, Calendar, Hash, CheckCircle } from 'lucide-react';
import { ResponsiveContainer } from './ResponsiveContainer';
import { SettingSection } from './SettingSection';
import { useI18n } from '../i18n';
import { BackButton } from './BackButton';
import {
  getTriggerLabel,
} from './chain-editor/constants';
import { AuxiliarySignalSection, BasicInfoSection, DurationSection } from './task-group-editor';

interface FormErrors {
  name?: string;
  description?: string;
  auxiliarySignal?: string;
  auxiliaryCompletionTrigger?: string;
}

interface MobileInfo {
  isMobile: boolean;
  touchSupport: boolean;
}

const ERROR_INPUT_BORDER_CLASSES = 'border-red-500 focus:border-red-500 focus:ring-red-500/20';

interface TaskGroupEditorViewProps {
  // Data
  chain?: Chain;
  isEditing: boolean;

  // Form state
  name: string;
  description: string;
  auxiliarySignal: string;
  customAuxiliarySignal: string;
  auxiliaryDuration: number;
  isCustomAuxiliaryDuration: boolean;
  auxiliaryCompletionTrigger: string;
  errors: FormErrors;

  // Mobile state
  mobileInfo: MobileInfo;
  isKeyboardVisible: boolean;
  keyboardHeight: number;

  // Handlers
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAuxiliarySignalSelect: (value: string) => void;
  onCustomAuxiliarySignalChange: (value: string) => void;
  onAuxiliaryDurationChange: (value: number) => void;
  onAuxiliaryDurationModeChange: (isCustom: boolean, value: number) => void;
  onAuxiliaryCompletionTriggerChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const TaskGroupEditorView: React.FC<TaskGroupEditorViewProps> = React.memo(({
  chain,
  isEditing,
  name,
  description,
  auxiliarySignal,
  customAuxiliarySignal,
  auxiliaryDuration,
  isCustomAuxiliaryDuration,
  auxiliaryCompletionTrigger,
  errors,
  mobileInfo,
  isKeyboardVisible,
  keyboardHeight,
  onNameChange,
  onDescriptionChange,
  onAuxiliarySignalSelect,
  onCustomAuxiliarySignalChange,
  onAuxiliaryDurationChange,
  onAuxiliaryDurationModeChange,
  onAuxiliaryCompletionTriggerChange,
  onSubmit,
  onCancel,
}) => {
  const { language, tr } = useI18n();

  return (
    <div
      className={`min-h-screen bg-background overflow-x-hidden ${isKeyboardVisible ? 'keyboard-active' : ''}`}
      style={{ paddingBottom: isKeyboardVisible ? `${keyboardHeight}px` : '0' }}
    >
      <ResponsiveContainer
        maxWidth="4xl"
        className={`py-4 md:py-6 ${mobileInfo.isMobile ? 'px-4' : ''}`}
      >
        {/* Header */}
        <header className="flex items-center justify-between mb-8 md:mb-10 animate-fade-in">
          <div className="flex items-center space-x-4">
            <BackButton
              onClick={onCancel}
              label={tr('返回', 'Back')}
              className="p-3 text-gray-400 hover:text-[#161615] transition-colors rounded-2xl hover:bg-white/50"
            />
            <div>
              <h1 className="text-4xl md:text-5xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-2">
                {isEditing ? tr('编辑任务群', 'Edit group') : tr('创建任务群', 'Create group')}
              </h1>
              <p className="text-sm font-mono text-gray-500 tracking-wider uppercase">
                {isEditing ? tr('编辑任务群', 'EDIT GROUP') : tr('创建任务群', 'CREATE GROUP')}
              </p>
            </div>
          </div>

          {/* Task Group Completion Counter */}
          {chain && isEditing && (
            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/50 rounded-2xl px-4 py-3">
              <div className="flex items-center space-x-2">
                <Hash className="text-primary-600 dark:text-primary-400" size={16} />
                <span className="text-primary-700 dark:text-primary-300 font-bold text-lg">
                  #{chain.totalCompletions || 0}
                </span>
              </div>
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-1 font-chinese">
                {tr('完成次数', 'Completions')}
              </p>
            </div>
          )}
        </header>

        <form onSubmit={onSubmit} className="space-y-6 md:space-y-8 animate-slide-up">
          {/* 基础信息区 */}
          <BasicInfoSection
            name={name}
            description={description}
            errors={errors}
            onNameChange={onNameChange}
            onDescriptionChange={onDescriptionChange}
            tr={tr}
          />

          {/* 辅助链设置区 */}
          <BookingSettingsSection
            auxiliarySignal={auxiliarySignal}
            customAuxiliarySignal={customAuxiliarySignal}
            auxiliaryDuration={auxiliaryDuration}
            isCustomAuxiliaryDuration={isCustomAuxiliaryDuration}
            auxiliaryCompletionTrigger={auxiliaryCompletionTrigger}
            errors={errors}
            language={language}
            onAuxiliarySignalSelect={onAuxiliarySignalSelect}
            onCustomAuxiliarySignalChange={onCustomAuxiliarySignalChange}
            onAuxiliaryDurationChange={onAuxiliaryDurationChange}
            onAuxiliaryDurationModeChange={onAuxiliaryDurationModeChange}
            onAuxiliaryCompletionTriggerChange={onAuxiliaryCompletionTriggerChange}
            tr={tr}
          />

          {/* 操作按钮区 */}
          <ActionButtons
            isEditing={isEditing}
            mobileInfo={mobileInfo}
            onCancel={onCancel}
            tr={tr}
          />
        </form>
      </ResponsiveContainer>
    </div>
  );
});

TaskGroupEditorView.displayName = 'TaskGroupEditorView';

interface BookingSettingsSectionProps {
  auxiliarySignal: string;
  customAuxiliarySignal: string;
  auxiliaryDuration: number;
  isCustomAuxiliaryDuration: boolean;
  auxiliaryCompletionTrigger: string;
  errors: FormErrors;
  language: 'zh' | 'en';
  onAuxiliarySignalSelect: (value: string) => void;
  onCustomAuxiliarySignalChange: (value: string) => void;
  onAuxiliaryDurationChange: (value: number) => void;
  onAuxiliaryDurationModeChange: (isCustom: boolean, value: number) => void;
  onAuxiliaryCompletionTriggerChange: (value: string) => void;
  tr: (zh: string, en: string) => string;
}

const BookingSettingsSection: React.FC<BookingSettingsSectionProps> = React.memo(({
  auxiliarySignal,
  customAuxiliarySignal,
  auxiliaryDuration,
  isCustomAuxiliaryDuration,
  auxiliaryCompletionTrigger,
  errors,
  language,
  onAuxiliarySignalSelect,
  onCustomAuxiliarySignalChange,
  onAuxiliaryDurationChange,
  onAuxiliaryDurationModeChange,
  onAuxiliaryCompletionTriggerChange,
  tr,
}) => (
  <SettingSection
    title={tr('预约功能设置', 'Booking settings')}
    icon={<Calendar className="text-blue-500" size={20} />}
    description={tr('配置预约信号、时长和完成条件', 'Configure booking signal, duration, and completion condition')}
  >
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AuxiliarySignalSection
        auxiliarySignal={auxiliarySignal}
        customAuxiliarySignal={customAuxiliarySignal}
        errors={errors}
        language={language}
        onAuxiliarySignalSelect={onAuxiliarySignalSelect}
        onCustomAuxiliarySignalChange={onCustomAuxiliarySignalChange}
        tr={tr}
      />

      <DurationSection
        auxiliaryDuration={auxiliaryDuration}
        isCustomAuxiliaryDuration={isCustomAuxiliaryDuration}
        onAuxiliaryDurationChange={onAuxiliaryDurationChange}
        onAuxiliaryDurationModeChange={onAuxiliaryDurationModeChange}
        tr={tr}
      />

      {/* 预约完成条件 */}
      <div className="bento-card p-4 md:p-5 border-l-4 border-l-blue-500 animate-scale-in md:col-span-2">
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle className="text-blue-500" size={18} />
          <div className="min-w-0">
            <h4 className="text-base font-semibold font-chinese text-gray-900 dark:text-slate-100">
              {tr('预约完成条件', 'Completion condition')}
            </h4>
            <p className="text-[11px] font-mono text-gray-500">{tr('完成条件', 'COMPLETION CONDITION')}</p>
          </div>
        </div>

        <input
          type="text"
          id="auxiliary-completion-trigger"
          name="auxiliaryCompletionTrigger"
          value={getTriggerLabel(auxiliaryCompletionTrigger, language)}
          onChange={(e) => onAuxiliaryCompletionTriggerChange(e.target.value)}
          placeholder={tr('例如：打开第一个子任务、准备好工作材料', 'e.g. Open the first subtask, prepare your materials')}
          className={`w-full bg-gray-50 dark:bg-slate-700 border ${
            errors.auxiliaryCompletionTrigger
              ? ERROR_INPUT_BORDER_CLASSES
              : 'border-gray-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20'
          } rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 transition duration-300 font-chinese`}
          required
        />

        {errors.auxiliaryCompletionTrigger && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 font-chinese">{errors.auxiliaryCompletionTrigger}</p>
        )}

        <details className="mt-3 text-xs text-gray-500 dark:text-slate-400">
          <summary className="cursor-pointer font-chinese">{tr('说明', 'Note')}</summary>
          <p className="mt-2 leading-relaxed">
            {tr(
              '这是你在预约时间内必须完成的动作，标志着正式开始执行任务群。',
              'This is the action you must complete during booking—signaling the start of the group execution.'
            )}
          </p>
        </details>
      </div>
    </div>
  </SettingSection>
));

BookingSettingsSection.displayName = 'BookingSettingsSection';

interface ActionButtonsProps {
  isEditing: boolean;
  mobileInfo: MobileInfo;
  onCancel: () => void;
  tr: (zh: string, en: string) => string;
}

const ActionButtons: React.FC<ActionButtonsProps> = React.memo(({
  isEditing,
  mobileInfo,
  onCancel,
  tr,
}) => (
  <div className={`action-buttons flex ${mobileInfo.isMobile ? 'flex-col space-y-4' : 'flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6'} animate-scale-in pt-4`}>
    <button
      type="button"
      onClick={onCancel}
      className={`mobile-touch-target flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 px-8 py-4 rounded-2xl font-medium transition duration-300 flex items-center justify-center space-x-3 ${mobileInfo.touchSupport ? 'active:scale-98' : 'hover:scale-105'} font-chinese ${mobileInfo.isMobile ? 'min-h-[48px] text-base' : ''}`}
    >
      <span>{tr('取消', 'Cancel')}</span>
    </button>
    <button
      type="submit"
      className={`mobile-touch-target flex-1 gradient-primary hover:shadow-xl text-white px-8 py-4 rounded-2xl font-medium transition duration-300 flex items-center justify-center space-x-3 ${mobileInfo.touchSupport ? 'active:scale-98' : 'hover:scale-105'} shadow-lg font-chinese ${mobileInfo.isMobile ? 'min-h-[48px] text-base' : ''}`}
    >
      <Save size={20} />
      <span>{isEditing ? tr('保存更改', 'Save changes') : tr('创建任务群', 'Create group')}</span>
    </button>
  </div>
));

ActionButtons.displayName = 'ActionButtons';
