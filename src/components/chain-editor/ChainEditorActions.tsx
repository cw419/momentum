import { Copy, Save } from 'lucide-react';
import type { ChainEditorFormModel } from './hooks/useChainEditorForm';
import { useI18n } from '../../i18n';

interface MobileInfo {
  isMobile: boolean;
  touchSupport: boolean;
}

interface ChainEditorActionsProps {
  isEditing: boolean;
  onCancel: () => void;
  form: ChainEditorFormModel;
  mobileInfo: MobileInfo;
}

export function ChainEditorActions({ isEditing, onCancel, form, mobileInfo }: ChainEditorActionsProps) {
  const { tr } = useI18n();

  let saveButtonLabel: string;
  if (form.isCopyMode) {
    saveButtonLabel = tr('创建副本', 'Create copy');
  } else if (isEditing) {
    saveButtonLabel = tr('保存更改', 'Save changes');
  } else {
    saveButtonLabel = tr('创建链条', 'Create chain');
  }

  const containerClassName = `action-buttons flex ${
    mobileInfo.isMobile ? 'flex-col space-y-4' : 'flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6'
  } animate-scale-in pt-4`;

  const cancelButtonClassName = `mobile-touch-target flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 px-8 py-4 rounded-2xl font-medium transition duration-300 flex items-center justify-center space-x-3 ${
    mobileInfo.touchSupport ? 'active:scale-98' : 'hover:scale-105'
  } font-chinese ${mobileInfo.isMobile ? 'min-h-[48px] text-base' : ''}`;

  const copyButtonClassName = `mobile-touch-target flex-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-8 py-4 rounded-2xl font-medium transition duration-300 flex items-center justify-center space-x-3 ${
    mobileInfo.touchSupport ? 'active:scale-98' : 'hover:scale-105'
  } font-chinese ${mobileInfo.isMobile ? 'min-h-[48px] text-base' : ''}`;

  const saveButtonClassName = `mobile-touch-target flex-1 gradient-primary hover:shadow-xl text-white px-8 py-4 rounded-2xl font-medium transition duration-300 flex items-center justify-center space-x-3 ${
    mobileInfo.touchSupport ? 'active:scale-98' : 'hover:scale-105'
  } shadow-lg font-chinese ${mobileInfo.isMobile ? 'min-h-[48px] text-base' : ''}`;

  return (
    <div className={containerClassName}>
      <button type="button" onClick={onCancel} className={cancelButtonClassName}>
        <span>{tr('取消', 'Cancel')}</span>
      </button>

      {isEditing && (
        <button type="submit" onClick={() => form.setIsCopyMode(true)} className={copyButtonClassName}>
          <Copy size={20} />
          <span>{tr('另存为副本', 'Save as copy')}</span>
        </button>
      )}

      <button type="submit" className={saveButtonClassName}>
        <Save size={20} />
        <span>{saveButtonLabel}</span>
      </button>
    </div>
  );
}
