import type { Chain, ChainDraft } from '../../types';
import { useMobileOptimization, useTouchOptimization, useVirtualKeyboardAdaptation } from '../../hooks/useMobileOptimization';
import { useChainEditorForm } from './hooks/useChainEditorForm';
import { ChainEditorView } from './ChainEditorView';

interface ChainEditorProps {
  chain?: Chain;
  isEditing: boolean;
  initialParentId?: string;
  onSave: (chain: ChainDraft, isCopy?: boolean) => void;
  onCancel: () => void;
}

export function ChainEditor({ chain, isEditing, initialParentId, onSave, onCancel }: ChainEditorProps) {
  const form = useChainEditorForm({ chain, isEditing, initialParentId, onSave });

  const mobileInfo = useMobileOptimization();
  useTouchOptimization();
  const { keyboardHeight, isKeyboardVisible } = useVirtualKeyboardAdaptation();

  return (
    <ChainEditorView
      isEditing={isEditing}
      onCancel={onCancel}
      form={form}
      mobileInfo={mobileInfo}
      keyboardHeight={keyboardHeight}
      isKeyboardVisible={isKeyboardVisible}
    />
  );
}

