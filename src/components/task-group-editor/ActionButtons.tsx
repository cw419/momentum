import React from 'react';
import { Save } from 'lucide-react';

import type { MobileInfo } from './types';

interface ActionButtonsProps {
  isEditing: boolean;
  mobileInfo: MobileInfo;
  onCancel: () => void;
  tr: (zh: string, en: string) => string;
}

export const ActionButtons: React.FC<ActionButtonsProps> = React.memo(({ isEditing, mobileInfo, onCancel, tr }) => (
  <div
    className={`action-buttons flex ${
      mobileInfo.isMobile
        ? 'flex-col space-y-4'
        : 'flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6'
    } animate-scale-in pt-4`}
  >
    <button
      type="button"
      onClick={onCancel}
      className={`mobile-touch-target flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 px-8 py-4 rounded-2xl font-medium transition duration-300 flex items-center justify-center space-x-3 ${
        mobileInfo.touchSupport ? 'active:scale-98' : 'hover:scale-105'
      } font-chinese ${mobileInfo.isMobile ? 'min-h-[48px] text-base' : ''}`}
    >
      <span>{tr('取消', 'Cancel')}</span>
    </button>
    <button
      type="submit"
      className={`mobile-touch-target flex-1 gradient-primary hover:shadow-xl text-white px-8 py-4 rounded-2xl font-medium transition duration-300 flex items-center justify-center space-x-3 ${
        mobileInfo.touchSupport ? 'active:scale-98' : 'hover:scale-105'
      } shadow-lg font-chinese ${mobileInfo.isMobile ? 'min-h-[48px] text-base' : ''}`}
    >
      <Save size={20} />
      <span>{isEditing ? tr('保存更改', 'Save changes') : tr('创建任务群', 'Create group')}</span>
    </button>
  </div>
));

ActionButtons.displayName = 'ActionButtons';

