import React from 'react';
import { Save } from 'lucide-react';

import type { MobileInfo } from './types';

interface ActionButtonsProps {
  isEditing: boolean;
  mobileInfo: MobileInfo;
  onCancel: () => void;
  tr: (zh: string, en: string) => string;
}

export const ActionButtons: React.FC<ActionButtonsProps> = React.memo(
  ({ isEditing, mobileInfo, onCancel, tr }) => (
    <div
      className={`action-buttons flex ${
        mobileInfo.isMobile
          ? 'flex-col space-y-4'
          : 'flex-col space-y-4 sm:flex-row sm:space-x-6 sm:space-y-0'
      } animate-scale-in pt-4`}
    >
      <button
        type="button"
        onClick={onCancel}
        className={`mobile-touch-target flex flex-1 items-center justify-center space-x-3 rounded-2xl bg-gray-100 px-8 py-4 font-medium text-gray-900 transition duration-300 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 ${
          mobileInfo.touchSupport ? 'active:scale-98' : 'hover:scale-105'
        } font-chinese ${mobileInfo.isMobile ? 'min-h-[48px] text-base' : ''}`}
      >
        <span>{tr('取消', 'Cancel')}</span>
      </button>
      <button
        type="submit"
        className={`mobile-touch-target gradient-primary flex flex-1 items-center justify-center space-x-3 rounded-2xl px-8 py-4 font-medium text-white transition duration-300 hover:shadow-xl ${
          mobileInfo.touchSupport ? 'active:scale-98' : 'hover:scale-105'
        } font-chinese shadow-lg ${mobileInfo.isMobile ? 'min-h-[48px] text-base' : ''}`}
      >
        <Save size={20} />
        <span>
          {isEditing
            ? tr('保存更改', 'Save changes')
            : tr('创建任务群', 'Create group')}
        </span>
      </button>
    </div>
  ),
);

ActionButtons.displayName = 'ActionButtons';
