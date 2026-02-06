import React from 'react';
import { Hash } from 'lucide-react';

import { ResponsiveContainer } from '../ResponsiveContainer';
import { BackButton } from '../BackButton';
import { useI18n } from '../../i18n';

import { BasicInfoSection } from './BasicInfoSection';
import { BookingSettingsSection } from './BookingSettingsSection';
import { ActionButtons } from './ActionButtons';
import type { TaskGroupEditorViewProps } from './types';

export const TaskGroupEditorView: React.FC<TaskGroupEditorViewProps> = React.memo(
  ({
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
        <ResponsiveContainer maxWidth="4xl" className={`py-4 md:py-6 ${mobileInfo.isMobile ? 'px-4' : ''}`}>
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
                  <span className="text-primary-700 dark:text-primary-300 font-bold text-lg">#{chain.totalCompletions || 0}</span>
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
            <ActionButtons isEditing={isEditing} mobileInfo={mobileInfo} onCancel={onCancel} tr={tr} />
          </form>
        </ResponsiveContainer>
      </div>
    );
  }
);

TaskGroupEditorView.displayName = 'TaskGroupEditorView';

