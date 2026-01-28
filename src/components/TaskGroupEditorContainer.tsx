/**
 * TaskGroupEditorContainer - 状态和逻辑容器组件
 */

import React from 'react';
import type { Chain, ChainDraft } from '../types';
import { TaskGroupEditorView } from './TaskGroupEditorView';
import { useTaskGroupEditor } from './useTaskGroupEditor';

interface TaskGroupEditorContainerProps {
  chain?: Chain;
  isEditing: boolean;
  initialParentId?: string;
  onSave: (chain: ChainDraft) => void;
  onCancel: () => void;
}

export const TaskGroupEditorContainer: React.FC<TaskGroupEditorContainerProps> = ({
  chain,
  isEditing,
  initialParentId,
  onSave,
  onCancel,
}) => {
  const {
    name,
    description,
    auxiliarySignal,
    customAuxiliarySignal,
    auxiliaryDuration,
    isCustomAuxiliaryDuration,
    auxiliaryCompletionTrigger,
    errors,
    handleNameChange,
    handleDescriptionChange,
    handleAuxiliarySignalSelect,
    handleCustomAuxiliarySignalChange,
    handleDurationSelect,
    setAuxiliaryDuration,
    handleAuxiliaryCompletionTriggerChange,
    handleSubmit,
    mobileInfo,
    keyboardHeight,
    isKeyboardVisible,
  } = useTaskGroupEditor({
    chain,
    initialParentId,
    onSave,
  });

  return (
    <TaskGroupEditorView
      chain={chain}
      isEditing={isEditing}
      name={name}
      description={description}
      auxiliarySignal={auxiliarySignal}
      customAuxiliarySignal={customAuxiliarySignal}
      auxiliaryDuration={auxiliaryDuration}
      isCustomAuxiliaryDuration={isCustomAuxiliaryDuration}
      auxiliaryCompletionTrigger={auxiliaryCompletionTrigger}
      errors={errors}
      mobileInfo={mobileInfo}
      isKeyboardVisible={isKeyboardVisible}
      keyboardHeight={keyboardHeight}
      onNameChange={handleNameChange}
      onDescriptionChange={handleDescriptionChange}
      onAuxiliarySignalSelect={handleAuxiliarySignalSelect}
      onCustomAuxiliarySignalChange={handleCustomAuxiliarySignalChange}
      onAuxiliaryDurationChange={setAuxiliaryDuration}
      onAuxiliaryDurationModeChange={(isCustom, value) => {
        handleDurationSelect(isCustom ? "custom" : String(value));
      }}
      onAuxiliaryCompletionTriggerChange={handleAuxiliaryCompletionTriggerChange}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );
};
