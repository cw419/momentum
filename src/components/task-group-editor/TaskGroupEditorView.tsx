import React from 'react';
import { Hash } from 'lucide-react';

import { ResponsiveContainer } from '../ResponsiveContainer';
import { BackButton } from '../BackButton';
import { useI18n } from '../../i18n';

import { BasicInfoSection } from './BasicInfoSection';
import { BookingSettingsSection } from './BookingSettingsSection';
import { ActionButtons } from './ActionButtons';
import type { TaskGroupEditorViewProps } from './types';

export const TaskGroupEditorView: React.FC<TaskGroupEditorViewProps> =
  React.memo(
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
          className={`bg-background min-h-screen overflow-x-hidden ${isKeyboardVisible ? 'keyboard-active' : ''}`}
          style={{
            paddingBottom: isKeyboardVisible ? `${keyboardHeight}px` : '0',
          }}
        >
          <ResponsiveContainer
            maxWidth="4xl"
            className={`py-4 md:py-6 ${mobileInfo.isMobile ? 'px-4' : ''}`}
          >
            {/* Header */}
            <header className="mb-8 flex animate-fade-in items-center justify-between md:mb-10">
              <div className="flex items-center space-x-4">
                <BackButton
                  onClick={onCancel}
                  label={tr('返回', 'Back')}
                  className="rounded-2xl p-3 text-gray-400 transition-colors hover:bg-white/50 hover:text-[#161615]"
                />
                <div>
                  <h1 className="mb-2 font-chinese text-4xl font-bold text-[#161615] dark:text-slate-100 md:text-5xl">
                    {isEditing
                      ? tr('编辑任务群', 'Edit group')
                      : tr('创建任务群', 'Create group')}
                  </h1>
                  <p className="font-mono text-sm uppercase tracking-wider text-gray-500">
                    {isEditing
                      ? tr('编辑任务群', 'EDIT GROUP')
                      : tr('创建任务群', 'CREATE GROUP')}
                  </p>
                </div>
              </div>

              {/* Task Group Completion Counter */}
              {chain && isEditing && (
                <div className="rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 dark:border-primary-700/50 dark:bg-primary-900/20">
                  <div className="flex items-center space-x-2">
                    <Hash
                      className="text-primary-600 dark:text-primary-400"
                      size={16}
                    />
                    <span className="text-lg font-bold text-primary-700 dark:text-primary-300">
                      #{chain.totalCompletions || 0}
                    </span>
                  </div>
                  <p className="mt-1 font-chinese text-xs text-primary-600 dark:text-primary-400">
                    {tr('完成次数', 'Completions')}
                  </p>
                </div>
              )}
            </header>

            <form
              onSubmit={onSubmit}
              className="animate-slide-up space-y-6 md:space-y-8"
            >
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
                onAuxiliaryCompletionTriggerChange={
                  onAuxiliaryCompletionTriggerChange
                }
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
    },
  );

TaskGroupEditorView.displayName = 'TaskGroupEditorView';
