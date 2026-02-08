import React from 'react';
import { Calendar, CheckCircle } from 'lucide-react';

import { SettingSection } from '../SettingSection';
import { getTriggerLabel } from '../chain-editor/constants';

import { AuxiliarySignalSection } from './AuxiliarySignalSection';
import { DurationSection } from './DurationSection';
import type { FormErrors } from './types';

const ERROR_INPUT_BORDER_CLASSES =
  'border-red-500 focus:border-red-500 focus:ring-red-500/20';

interface BookingSettingsSectionProps {
  auxiliarySignal: string;
  customAuxiliarySignal: string;
  auxiliaryDuration: number;
  isCustomAuxiliaryDuration: boolean;
  auxiliaryCompletionTrigger: string;
  errors: FormErrors;
  language: 'zh' | 'en';
  onAuxiliarySignalSelect: (value: string) => void;
  onCustomAuxiliarySignalChange: (value: string) => void;
  onAuxiliaryDurationChange: (value: number) => void;
  onAuxiliaryDurationModeChange: (isCustom: boolean, value: number) => void;
  onAuxiliaryCompletionTriggerChange: (value: string) => void;
  tr: (zh: string, en: string) => string;
}

export const BookingSettingsSection: React.FC<BookingSettingsSectionProps> =
  React.memo(
    ({
      auxiliarySignal,
      customAuxiliarySignal,
      auxiliaryDuration,
      isCustomAuxiliaryDuration,
      auxiliaryCompletionTrigger,
      errors,
      language,
      onAuxiliarySignalSelect,
      onCustomAuxiliarySignalChange,
      onAuxiliaryDurationChange,
      onAuxiliaryDurationModeChange,
      onAuxiliaryCompletionTriggerChange,
      tr,
    }) => (
      <SettingSection
        title={tr('预约功能设置', 'Booking settings')}
        icon={<Calendar className="text-blue-500" size={20} />}
        description={tr(
          '配置预约信号、时长和完成条件',
          'Configure booking signal, duration, and completion condition',
        )}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AuxiliarySignalSection
            auxiliarySignal={auxiliarySignal}
            customAuxiliarySignal={customAuxiliarySignal}
            errors={errors}
            language={language}
            onAuxiliarySignalSelect={onAuxiliarySignalSelect}
            onCustomAuxiliarySignalChange={onCustomAuxiliarySignalChange}
            tr={tr}
          />

          <DurationSection
            auxiliaryDuration={auxiliaryDuration}
            isCustomAuxiliaryDuration={isCustomAuxiliaryDuration}
            onAuxiliaryDurationChange={onAuxiliaryDurationChange}
            onAuxiliaryDurationModeChange={onAuxiliaryDurationModeChange}
            tr={tr}
          />

          {/* 预约完成条件 */}
          <div className="bento-card animate-scale-in border-l-4 border-l-blue-500 p-4 md:col-span-2 md:p-5">
            <div className="mb-3 flex items-center gap-3">
              <CheckCircle className="text-blue-500" size={18} />
              <div className="min-w-0">
                <h4 className="font-chinese text-base font-semibold text-gray-900 dark:text-slate-100">
                  {tr('预约完成条件', 'Completion condition')}
                </h4>
                <p className="font-mono text-[11px] text-gray-500">
                  {tr('完成条件', 'COMPLETION CONDITION')}
                </p>
              </div>
            </div>

            <input
              type="text"
              id="auxiliary-completion-trigger"
              name="auxiliaryCompletionTrigger"
              value={getTriggerLabel(auxiliaryCompletionTrigger, language)}
              onChange={(e) =>
                onAuxiliaryCompletionTriggerChange(e.target.value)
              }
              placeholder={tr(
                '例如：打开第一个子任务、准备好工作材料',
                'e.g. Open the first subtask, prepare your materials',
              )}
              className={`w-full border bg-gray-50 dark:bg-slate-700 ${
                errors.auxiliaryCompletionTrigger
                  ? ERROR_INPUT_BORDER_CLASSES
                  : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-slate-600'
              } rounded-2xl px-4 py-3 font-chinese text-gray-900 placeholder-gray-400 transition duration-300 focus:outline-none focus:ring-2 dark:text-slate-100 dark:placeholder-slate-400`}
              required
            />

            {errors.auxiliaryCompletionTrigger && (
              <p className="mt-2 font-chinese text-sm text-red-600 dark:text-red-400">
                {errors.auxiliaryCompletionTrigger}
              </p>
            )}

            <details className="mt-3 text-xs text-gray-500 dark:text-slate-400">
              <summary className="cursor-pointer font-chinese">
                {tr('说明', 'Note')}
              </summary>
              <p className="mt-2 leading-relaxed">
                {tr(
                  '这是你在预约时间内必须完成的动作，标志着正式开始执行任务群。',
                  'This is the action you must complete during booking—signaling the start of the group execution.',
                )}
              </p>
            </details>
          </div>
        </div>
      </SettingSection>
    ),
  );

BookingSettingsSection.displayName = 'BookingSettingsSection';
