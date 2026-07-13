import type { FormEvent } from 'react';
import type { Chain, RSIPNode, RSIPTaskLink } from '../../types';

export interface FormErrors {
  name?: string;
  description?: string;
  auxiliarySignal?: string;
  auxiliaryCompletionTrigger?: string;
}

export interface TaskGroupEditorViewProps {
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

  keyboardHeight: number;

  // Handlers
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAuxiliarySignalSelect: (value: string) => void;
  onCustomAuxiliarySignalChange: (value: string) => void;
  onAuxiliaryDurationChange: (value: number) => void;
  onAuxiliaryDurationModeChange: (isCustom: boolean, value: number) => void;
  onAuxiliaryCompletionTriggerChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;

  // RSIP integration entry (task/group side)
  rsipNodes?: RSIPNode[];
  rsipTaskLinks?: RSIPTaskLink[];
  onUpsertRSIPTaskLinks?: (links: RSIPTaskLink[]) => void | Promise<unknown>;
}
