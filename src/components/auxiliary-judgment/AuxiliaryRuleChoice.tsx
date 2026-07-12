import { CheckCircle } from 'lucide-react';
import type { Chain } from '../../types';

export function AuxiliaryRuleChoice(props: {
  chain: Chain;
  useExistingRule: boolean;
  onRuleTypeChange: (useExisting: boolean) => void;
  selectedExistingRule: string;
  onSelectedExistingRuleChange: (rule: string) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  tr: (zh: string, en: string) => string;
}) {
  const exceptions = props.chain.auxiliaryExceptions ?? [];
  const hasExceptions = exceptions.length > 0;
  return (
    <div className="mb-8 space-y-6">
      {hasExceptions && (
        <div className="space-y-4">
          <div className="flex items-center space-x-6">
            <label className="flex cursor-pointer items-center space-x-3">
              <input
                type="radio"
                name="ruleType"
                checked={props.useExistingRule}
                onChange={() => props.onRuleTypeChange(true)}
                className="h-5 w-5 text-green-500 focus:ring-2 focus:ring-green-500"
              />
              <span className="font-chinese font-medium text-green-600 dark:text-green-400">
                {props.tr('使用已有例外规则', 'Use an existing exception')}
              </span>
            </label>
            <label className="flex cursor-pointer items-center space-x-3">
              <input
                type="radio"
                name="ruleType"
                checked={!props.useExistingRule}
                onChange={() => props.onRuleTypeChange(false)}
                className="h-5 w-5 text-yellow-500 focus:ring-2 focus:ring-yellow-500"
              />
              <span className="font-chinese font-medium text-yellow-600 dark:text-yellow-400">
                {props.tr('添加新例外规则', 'Add a new exception')}
              </span>
            </label>
          </div>
        </div>
      )}
      {props.useExistingRule && hasExceptions && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 dark:border-green-700/50 dark:bg-green-900/20">
          <label
            htmlFor="auxiliary-existing-rule-select"
            className="mb-3 block font-chinese text-sm font-medium text-green-700 dark:text-green-300"
          >
            {props.tr(
              '选择适用的例外规则：',
              'Choose an applicable exception:',
            )}
          </label>
          <select
            id="auxiliary-existing-rule-select"
            name="existingExceptionRule"
            value={props.selectedExistingRule}
            onChange={(event) =>
              props.onSelectedExistingRuleChange(event.target.value)
            }
            className="w-full rounded-2xl border border-green-300 bg-white px-4 py-3 font-chinese text-gray-900 transition duration-300 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-green-600 dark:bg-slate-700 dark:text-slate-100"
          >
            {[...new Set(exceptions)].map((exception) => (
              <option
                key={exception}
                value={exception}
                className="bg-white dark:bg-slate-700"
              >
                {exception}
              </option>
            ))}
          </select>
          <div className="mt-4 rounded-2xl border border-green-200 bg-green-100 p-4 dark:border-green-700/50 dark:bg-green-800/30">
            <div className="flex items-center space-x-3 text-green-700 dark:text-green-300">
              <CheckCircle size={20} />
              <span className="font-chinese text-sm">
                {props.tr(
                  '此行为已被允许，可以直接结束预约',
                  'This behavior is allowed; you may end the booking.',
                )}
              </span>
            </div>
          </div>
        </div>
      )}
      {!props.useExistingRule && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-700/50 dark:bg-yellow-900/20">
          <label
            htmlFor="auxiliary-new-rule-reason"
            className="mb-3 block font-chinese text-sm font-medium text-yellow-700 dark:text-yellow-300"
          >
            {props.tr('请描述具体行为：', 'Describe what happened:')}
          </label>
          <textarea
            id="auxiliary-new-rule-reason"
            name="newExceptionRuleReason"
            value={props.reason}
            onChange={(event) => props.onReasonChange(event.target.value)}
            placeholder={props.tr(
              '例如：忘记了预约、被紧急事务打断、身体不适、临时有其他安排等',
              'e.g. Forgot the booking, got interrupted by an urgent issue, felt unwell, had a sudden schedule change, etc.',
            )}
            className="w-full resize-none rounded-2xl border border-yellow-300 bg-white px-4 py-3 font-chinese text-gray-900 placeholder-gray-400 transition duration-300 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 dark:border-yellow-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
            rows={3}
          />
          {props.reason.trim() && exceptions.includes(props.reason.trim()) && (
            <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-100 p-4 dark:border-yellow-700/50 dark:bg-yellow-800/30">
              <p className="font-chinese text-sm text-yellow-700 dark:text-yellow-300">
                {props.tr(
                  '⚠️ 此规则已存在，建议选择“使用已有例外规则”',
                  '⚠️ This rule already exists. Consider choosing “Use an existing exception”.',
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
