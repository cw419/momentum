import { Info } from 'lucide-react';
import type { RSIPMode } from '../../types';

interface RSIPModeSwitchProps {
  mode: RSIPMode;
  onModeChange: (mode: RSIPMode) => void;
}

export function RSIPModeSwitch({ mode, onModeChange }: RSIPModeSwitchProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
      <div className="flex items-center gap-3">
        <span className="text-gray-700 dark:text-white/70">RSIP 模式</span>
        <div className="group relative">
          <Info size={16} className="text-gray-400 dark:text-white/40 cursor-help" />
          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-800 rounded-xl text-xs text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-50 shadow-xl">
            <p className="font-medium text-white mb-1">严格模式</p>
            <p>启用完整的递归稳态迭代协议：定式执行追踪、稳态阶段升级、约束力可视化、每日打卡提醒。</p>
          </div>
        </div>
      </div>

      <div className="flex bg-gray-200 dark:bg-white/10 rounded-xl p-1">
        <button
          type="button"
          onClick={() => onModeChange('free')}
          className={`px-4 py-2 rounded-lg transition cursor-pointer ${
            mode === 'free'
              ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'
          }`}
        >
          自由
        </button>
        <button
          type="button"
          onClick={() => onModeChange('strict')}
          className={`px-4 py-2 rounded-lg transition cursor-pointer ${
            mode === 'strict'
              ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white'
              : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'
          }`}
        >
          严格
        </button>
      </div>
    </div>
  );
}
