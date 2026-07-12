import { CheckCircle, List } from 'lucide-react';
import type { Chain } from '../../types';

export function AuxiliaryJudgmentActions(props: {
  chain: Chain;
  language: 'zh' | 'en';
  reason: string;
  useExistingRule: boolean;
  selectedExistingRule: string;
  onFailure: () => void;
  onAllow: () => void;
  onCancel: () => void;
  tr: (zh: string, en: string) => string;
}) {
  const exceptions = props.chain.auxiliaryExceptions ?? [];
  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          aria-label={props.tr('判定失败', 'Mark as failed')}
          onClick={props.onFailure}
          className="w-full rounded-2xl bg-red-500 px-6 py-3 font-chinese font-medium text-white shadow-lg transition duration-300 hover:scale-105 hover:bg-red-600"
        >
          <div className="text-left">
            <div className="text-lg font-bold">
              {props.tr('判定失败', 'Mark as failed')}
            </div>
            <div className="text-sm text-red-200">
              {props.language === 'zh'
                ? `辅助链记录将从 #${props.chain.auxiliaryStreak} 清零为 #0`
                : `Booking streak resets from #${props.chain.auxiliaryStreak} to #0`}
            </div>
          </div>
        </button>
        <button
          type="button"
          aria-label={props.tr('判定允许（下必为例）', 'Allow (Precedent)')}
          onClick={props.onAllow}
          disabled={
            props.useExistingRule
              ? !props.selectedExistingRule
              : !props.reason.trim()
          }
          className={`w-full rounded-2xl px-6 py-3 font-chinese font-medium text-white shadow-lg transition duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:bg-gray-300 ${props.useExistingRule ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'}`}
        >
          <div className="text-left">
            <div className="text-lg font-bold">
              {props.tr('判定允许（下必为例）', 'Allow (Precedent)')}
            </div>
            <div
              className={`text-sm ${props.useExistingRule ? 'text-green-200' : 'text-yellow-200'}`}
            >
              {props.useExistingRule
                ? props.tr(
                    '根据已有规则，此行为被允许',
                    'This behavior is allowed under an existing rule',
                  )
                : props.tr(
                    '此情况将永久添加到辅助链例外规则中',
                    'This will be saved as a new exception for future bookings',
                  )}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={props.onCancel}
          className="w-full rounded-2xl bg-gray-100 px-4 py-2 font-chinese font-medium text-gray-900 transition duration-300 hover:scale-105 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
        >
          {props.tr('取消 - 继续预约', 'Cancel — continue booking')}
        </button>
      </div>
      {exceptions.length > 0 && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-700/50">
          <h4 className="mb-4 flex items-center space-x-2 font-chinese font-medium text-gray-900 dark:text-slate-100">
            <List className="text-blue-500" size={20} />
            <span>
              {props.tr('当前辅助链例外规则：', 'Current booking exceptions:')}
            </span>
          </h4>
          <div className="max-h-32 space-y-2 overflow-y-auto">
            {[...new Set(exceptions)].map((exception) => (
              <div
                key={exception}
                className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400"
              >
                <CheckCircle size={12} />
                <span className="font-chinese">{exception}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
