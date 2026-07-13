import type { Chain, ChainDraft, RSIPNode, RSIPTaskLink } from '../../types';
import { useVirtualKeyboard } from '../../hooks/useVirtualKeyboard';
import { useChainEditorForm } from './hooks/useChainEditorForm';
import { ChainEditorView } from './ChainEditorView';

interface ChainEditorProps {
  chain?: Chain;
  isEditing: boolean;
  initialParentId?: string;
  onSave: (chain: ChainDraft, isCopy?: boolean) => void;
  onCancel: () => void;
  rsipNodes?: RSIPNode[];
  rsipTaskLinks?: RSIPTaskLink[];
  onUpsertRSIPTaskLinks?: (links: RSIPTaskLink[]) => void | Promise<unknown>;
}

export function ChainEditor({
  chain,
  isEditing,
  initialParentId,
  onSave,
  onCancel,
  rsipNodes,
  rsipTaskLinks,
  onUpsertRSIPTaskLinks,
}: ChainEditorProps) {
  const form = useChainEditorForm({
    chain,
    isEditing,
    initialParentId,
    onSave,
  });

  const { keyboardHeight } = useVirtualKeyboard();

  return (
    <ChainEditorView
      chain={chain}
      isEditing={isEditing}
      onCancel={onCancel}
      form={form}
      keyboardHeight={keyboardHeight}
      rsipNodes={rsipNodes}
      rsipTaskLinks={rsipTaskLinks}
      onUpsertRSIPTaskLinks={onUpsertRSIPTaskLinks}
    />
  );
}
