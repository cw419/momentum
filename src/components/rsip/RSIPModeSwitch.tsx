import { Info } from 'lucide-react';
import type { RSIPMode } from '../../types';

interface RSIPModeSwitchProps {
  mode: RSIPMode;
  onModeChange: (mode: RSIPMode) => void;
}

export function RSIPModeSwitch({ mode, onModeChange }: RSIPModeSwitchProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-100 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-3">
        <span className="text-gray-700 dark:text-white/70">RSIP 模式</span>
        <div className="group relative">
          <Info
            size={16}
            className="cursor-help text-gray-400 dark:text-white/40"
          />
          <div className="invisible absolute bottom-full left-0 z-50 mb-2 w-64 rounded-xl bg-gray-800 p-3 text-xs text-white/80 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
            <p className="mb-1 font-medium text-white">严格模式</p>
            <p>
              启用完整的递归稳态迭代协议：定式执行追踪、稳态阶段升级、约束力可视化、每日打卡提醒。
            </p>
          </div>
        </div>
      </div>

      <div className="flex rounded-xl bg-gray-200 p-1 dark:bg-white/10">
        <button
          type="button"
          onClick={() => onModeChange('free')}
          className={`cursor-pointer rounded-lg px-4 py-2 transition ${
            mode === 'free'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-white/20 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-white/50 dark:hover:text-white/70'
          }`}
        >
          自由
        </button>
        <button
          type="button"
          onClick={() => onModeChange('strict')}
          className={`cursor-pointer rounded-lg px-4 py-2 transition ${
            mode === 'strict'
              ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-white/50 dark:hover:text-white/70'
          }`}
        >
          严格
        </button>
      </div>
    </div>
  );
}
