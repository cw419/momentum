import React, { useState } from 'react';
import { Chain } from '../types';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Bell,
  Clock,
  List,
} from 'lucide-react';
import { useI18n } from '../i18n';
import {
  getAuxiliarySignalLabel,
  getTriggerLabel,
} from './chain-editor/constants';

interface AuxiliaryJudgmentProps {
  chain: Chain;
  onJudgmentFailure: (reason: string) => void;
  onJudgmentAllow: (exceptionRule: string) => void;
  onCancel: () => void;
}

export const AuxiliaryJudgment: React.FC<AuxiliaryJudgmentProps> = ({
  chain,
  onJudgmentFailure,
  onJudgmentAllow,
  onCancel,
}) => {
  const { language, tr } = useI18n();
  const [reason, setReason] = useState('');
  const [selectedExistingRule, setSelectedExistingRule] = useState('');
  const [useExistingRule, setUseExistingRule] = useState(false);
  const existingRuleSelectId = 'auxiliary-existing-rule-select';
  const reasonInputId = 'auxiliary-new-rule-reason';

  // 初始化时如果有已存在的规则，设置默认选择
  React.useEffect(() => {
    if (chain.auxiliaryExceptions && chain.auxiliaryExceptions.length > 0) {
      setSelectedExistingRule(chain.auxiliaryExceptions[0]);
    }
  }, [chain.auxiliaryExceptions]);

  const handleRuleTypeChange = (useExisting: boolean) => {
    setUseExistingRule(useExisting);
    if (useExisting) {
      setReason('');
      setSelectedExistingRule(chain.auxiliaryExceptions?.[0] || '');
    } else {
      setSelectedExistingRule('');
    }
  };

  const handleJudgmentAllowClick = () => {
    const ruleToAdd = useExistingRule ? selectedExistingRule : reason.trim();
    if (ruleToAdd) {
      // 只有在使用新规则且不存在时才添加
      if (!useExistingRule && !chain.auxiliaryExceptions?.includes(ruleToAdd)) {
        onJudgmentAllow(ruleToAdd);
      } else if (useExistingRule) {
        // 使用已有规则，不需要添加新规则，直接允许
        onJudgmentAllow(selectedExistingRule);
      } else {
        // 规则已存在，仍然调用允许函数但不会重复添加
        onJudgmentAllow(ruleToAdd);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl animate-scale-in overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
        <div className="mb-8 text-center">
          <div className="mb-6 flex items-center justify-center space-x-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-500/10">
              <Calendar size={32} className="text-blue-500" />
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-yellow-500/10">
              <AlertTriangle size={32} className="text-yellow-500" />
            </div>
          </div>
          <div className="mb-6">
            <h2 className="mb-2 font-chinese text-3xl font-bold text-gray-900 dark:text-slate-100">
              {tr('辅助链规则判定', 'Booking rule adjudication')}
            </h2>
            <p className="font-mono text-sm tracking-wider text-gray-500">
              {tr('辅助链规则判定', 'BOOKING RULE ADJUDICATION')}
            </p>
          </div>
          <p className="mb-6 font-chinese leading-relaxed text-gray-600 dark:text-slate-300">
            {tr(
              '你似乎做出了与预约承诺不符的行为。请描述具体情况并选择处理方式：',
              'It looks like your behavior didn’t match the booking commitment. Please describe what happened and choose how to handle it:',
            )}
          </p>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-700/50 dark:bg-blue-900/20">
            <div className="grid grid-cols-1 gap-4 text-blue-700 dark:text-blue-300 md:grid-cols-3">
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center space-x-2">
                  <Bell className="text-blue-500" size={16} />
                  <span className="font-chinese font-medium">
                    {tr('预约信号', 'Signal')}
                  </span>
                </div>
                <p className="font-mono text-sm">
                  {getAuxiliarySignalLabel(chain.auxiliarySignal, language)}
                </p>
              </div>
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center space-x-2">
                  <CheckCircle className="text-blue-500" size={16} />
                  <span className="font-chinese font-medium">
                    {tr('完成条件', 'Completion')}
                  </span>
                </div>
                <p className="font-chinese text-sm">
                  {getTriggerLabel(chain.auxiliaryCompletionTrigger, language)}
                </p>
              </div>
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center space-x-2">
                  <Clock className="text-blue-500" size={16} />
                  <span className="font-chinese font-medium">
                    {tr('预约时长', 'Duration')}
                  </span>
                </div>
                <p className="font-mono text-sm">
                  {tr(
                    `${chain.auxiliaryDuration}分钟`,
                    `${chain.auxiliaryDuration} min`,
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 space-y-6">
          {/* 规则类型选择 */}
          {chain.auxiliaryExceptions &&
            chain.auxiliaryExceptions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-6">
                  <label className="flex cursor-pointer items-center space-x-3">
                    <input
                      type="radio"
                      name="ruleType"
                      checked={useExistingRule}
                      onChange={() => handleRuleTypeChange(true)}
                      className="h-5 w-5 text-green-500 focus:ring-2 focus:ring-green-500"
                    />
                    <span className="font-chinese font-medium text-green-600 dark:text-green-400">
                      {tr('使用已有例外规则', 'Use an existing exception')}
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center space-x-3">
                    <input
                      type="radio"
                      name="ruleType"
                      checked={!useExistingRule}
                      onChange={() => handleRuleTypeChange(false)}
                      className="h-5 w-5 text-yellow-500 focus:ring-2 focus:ring-yellow-500"
                    />
                    <span className="font-chinese font-medium text-yellow-600 dark:text-yellow-400">
                      {tr('添加新例外规则', 'Add a new exception')}
                    </span>
                  </label>
                </div>
              </div>
            )}

          {/* 已有规则选择 */}
          {useExistingRule &&
            chain.auxiliaryExceptions &&
            chain.auxiliaryExceptions.length > 0 && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-6 dark:border-green-700/50 dark:bg-green-900/20">
                <label
                  htmlFor={existingRuleSelectId}
                  className="mb-3 block font-chinese text-sm font-medium text-green-700 dark:text-green-300"
                >
                  {tr(
                    '选择适用的例外规则：',
                    'Choose an applicable exception:',
                  )}
                </label>
                <select
                  id={existingRuleSelectId}
                  name="existingExceptionRule"
                  value={selectedExistingRule}
                  onChange={(e) => setSelectedExistingRule(e.target.value)}
                  className="w-full rounded-2xl border border-green-300 bg-white px-4 py-3 font-chinese text-gray-900 transition duration-300 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-green-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  {[...new Set(chain.auxiliaryExceptions)].map(
                    (exception, index) => (
                      <option
                        key={index}
                        value={exception}
                        className="bg-white dark:bg-slate-700"
                      >
                        {exception}
                      </option>
                    ),
                  )}
                </select>
                <div className="mt-4 rounded-2xl border border-green-200 bg-green-100 p-4 dark:border-green-700/50 dark:bg-green-800/30">
                  <div className="flex items-center space-x-3 text-green-700 dark:text-green-300">
                    <CheckCircle size={20} />
                    <span className="font-chinese text-sm">
                      {tr(
                        '此行为已被允许，可以直接结束预约',
                        'This behavior is allowed; you may end the booking.',
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

          {/* 新规则输入 */}
          {!useExistingRule && (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-700/50 dark:bg-yellow-900/20">
              <label
                htmlFor={reasonInputId}
                className="mb-3 block font-chinese text-sm font-medium text-yellow-700 dark:text-yellow-300"
              >
                {tr('请描述具体行为：', 'Describe what happened:')}
              </label>
              <textarea
                id={reasonInputId}
                name="newExceptionRuleReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={tr(
                  '例如：忘记了预约、被紧急事务打断、身体不适、临时有其他安排等',
                  'e.g. Forgot the booking, got interrupted by an urgent issue, felt unwell, had a sudden schedule change, etc.',
                )}
                className="w-full resize-none rounded-2xl border border-yellow-300 bg-white px-4 py-3 font-chinese text-gray-900 placeholder-gray-400 transition duration-300 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 dark:border-yellow-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
                rows={3}
              />
              {reason.trim() &&
                chain.auxiliaryExceptions?.includes(reason.trim()) && (
                  <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-100 p-4 dark:border-yellow-700/50 dark:bg-yellow-800/30">
                    <p className="font-chinese text-sm text-yellow-700 dark:text-yellow-300">
                      {tr(
                        '⚠️ 此规则已存在，建议选择“使用已有例外规则”',
                        '⚠️ This rule already exists. Consider choosing “Use an existing exception”.',
                      )}
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            type="button"
            aria-label={tr('判定失败', 'Mark as failed')}
            onClick={() =>
              onJudgmentFailure(
                reason || tr('用户主动中断预约', 'User interrupted booking'),
              )
            }
            className="w-full rounded-2xl bg-red-500 px-6 py-3 font-chinese font-medium text-white shadow-lg transition duration-300 hover:scale-105 hover:bg-red-600"
          >
            <div className="text-left">
              <div className="text-lg font-bold">
                {tr('判定失败', 'Mark as failed')}
              </div>
              <div className="text-sm text-red-200">
                {language === 'zh'
                  ? `辅助链记录将从 #${chain.auxiliaryStreak} 清零为 #0`
                  : `Booking streak resets from #${chain.auxiliaryStreak} to #0`}
              </div>
            </div>
          </button>

          <button
            type="button"
            aria-label={tr('判定允许（下必为例）', 'Allow (Precedent)')}
            onClick={handleJudgmentAllowClick}
            disabled={useExistingRule ? !selectedExistingRule : !reason.trim()}
            className={`w-full rounded-2xl px-6 py-3 font-chinese font-medium text-white shadow-lg transition duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:bg-gray-300 ${
              useExistingRule
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-yellow-500 hover:bg-yellow-600'
            }`}
          >
            <div className="text-left">
              <div className="text-lg font-bold">
                {tr('判定允许（下必为例）', 'Allow (Precedent)')}
              </div>
              <div
                className={`text-sm ${useExistingRule ? 'text-green-200' : 'text-yellow-200'}`}
              >
                {useExistingRule
                  ? tr(
                      '根据已有规则，此行为被允许',
                      'This behavior is allowed under an existing rule',
                    )
                  : tr(
                      '此情况将永久添加到辅助链例外规则中',
                      'This will be saved as a new exception for future bookings',
                    )}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-2xl bg-gray-100 px-4 py-2 font-chinese font-medium text-gray-900 transition duration-300 hover:scale-105 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            {tr('取消 - 继续预约', 'Cancel — continue booking')}
          </button>
        </div>

        {chain.auxiliaryExceptions && chain.auxiliaryExceptions.length > 0 && (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-700/50">
            <h4 className="mb-4 flex items-center space-x-2 font-chinese font-medium text-gray-900 dark:text-slate-100">
              <List className="text-blue-500" size={20} />
              <span>
                {tr('当前辅助链例外规则：', 'Current booking exceptions:')}
              </span>
            </h4>
            <div className="max-h-32 space-y-2 overflow-y-auto">
              {[...new Set(chain.auxiliaryExceptions)].map(
                (exception, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400"
                  >
                    <CheckCircle size={12} />
                    <span className="font-chinese">{exception}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
