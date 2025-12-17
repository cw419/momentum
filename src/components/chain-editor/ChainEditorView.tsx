import { ResponsiveContainer } from '../ResponsiveContainer';
import type { ChainEditorFormModel } from './hooks/useChainEditorForm';
import { ChainEditorActions } from './ChainEditorActions';
import { ChainEditorHeader } from './ChainEditorHeader';
import { AuxiliaryChainSettingsSection } from './sections/AuxiliaryChainSettingsSection';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { MainChainSettingsSection } from './sections/MainChainSettingsSection';
import { TaskDescriptionSection } from './sections/TaskDescriptionSection';

interface MobileInfo {
  isMobile: boolean;
  touchSupport: boolean;
}

interface ChainEditorViewProps {
  isEditing: boolean;
  onCancel: () => void;
  form: ChainEditorFormModel;
  mobileInfo: MobileInfo;
  keyboardHeight: number;
  isKeyboardVisible: boolean;
}

export function ChainEditorView({ isEditing, onCancel, form, mobileInfo, keyboardHeight, isKeyboardVisible }: ChainEditorViewProps) {
  return (
    <div
      className={`chain-editor-container min-h-screen bg-background overflow-x-hidden performance-layer ${
        isKeyboardVisible ? 'keyboard-active' : ''
      }`}
      style={{ paddingBottom: isKeyboardVisible ? `${keyboardHeight}px` : '0' }}
      data-scrollable="true"
    >
      <ResponsiveContainer
        maxWidth="4xl"
        className={`chain-editor-scroll-container py-4 md:py-6 ${mobileInfo.isMobile ? 'px-4' : ''}`}
        data-scrollable="true"
      >
        <ChainEditorHeader isEditing={isEditing} onCancel={onCancel} />

        <form onSubmit={form.handleSubmit} className="space-y-8 animate-slide-up performance-layer">
          <BasicInfoSection form={form} />
          <MainChainSettingsSection form={form} />
          <AuxiliaryChainSettingsSection form={form} />
          <TaskDescriptionSection form={form} />
          <ChainEditorActions isEditing={isEditing} onCancel={onCancel} form={form} mobileInfo={mobileInfo} />
        </form>

        {isKeyboardVisible && <div className="keyboard-buffer"></div>}
      </ResponsiveContainer>
    </div>
  );
}

