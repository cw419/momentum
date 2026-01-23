import { Bell, Calendar, CheckCircle, Hourglass } from 'lucide-react';
import { PureDOMSlider } from '../../PureDOMSlider';
import { SettingSection } from '../../SettingSection';
import { SliderContainer } from '../../SliderContainer';
import type { ChainEditorFormModel } from '../hooks/useChainEditorForm';
import {
  AUXILIARY_DURATION_PRESETS,
  AUXILIARY_SIGNAL_TEMPLATES,
  CUSTOM_AUXILIARY_SIGNAL_VALUE,
  getTriggerLabel,
} from '../constants';
import { useI18n } from '../../../i18n';

interface AuxiliaryChainSettingsSectionProps {
  form: ChainEditorFormModel;
}

export function AuxiliaryChainSettingsSection({ form }: AuxiliaryChainSettingsSectionProps) {
  const { language, tr } = useI18n();

  return (
    <SettingSection
      title={tr('辅助链设置', 'Auxiliary booking')}
      icon={<Calendar className="text-blue-500" size={20} />}
      description={tr('配置预约和完成条件', 'Configure booking and completion conditions')}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bento-card p-4 md:p-5 border-l-4 border-l-blue-500 animate-scale-in">
          <div className="flex items-center gap-3 mb-3">
            <Bell className="text-blue-500" size={18} />
            <div className="min-w-0">
              <h4 className="text-base font-semibold font-chinese text-gray-900 dark:text-slate-100">
                {tr('预约信号', 'Booking signal')}
              </h4>
              <p className="text-[11px] font-mono text-gray-500">{tr('预约信号', 'BOOKING SIGNAL')}</p>
            </div>
          </div>

          <select
            id="auxiliary-signal"
            name="auxiliarySignal"
            value={form.auxiliarySignal}
            onChange={(e) => form.handleAuxiliarySignalSelect(e.target.value)}
            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 font-chinese"
            required
          >
            <option value="" disabled className="text-gray-400">
              {tr('选择预约信号', 'Choose a booking signal')}
            </option>
            {AUXILIARY_SIGNAL_TEMPLATES.map((template, index) => (
              <option
                key={index}
                value={template.value}
                className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700"
              >
                {template.label[language]}
              </option>
            ))}
          </select>

          {form.auxiliarySignal === CUSTOM_AUXILIARY_SIGNAL_VALUE && (
            <input
              type="text"
              id="custom-auxiliary-signal"
              name="customAuxiliarySignal"
              value={form.customAuxiliarySignal}
              onChange={(e) => form.setCustomAuxiliarySignal(e.target.value)}
              placeholder={tr('输入你的自定义预约信号', 'Enter your custom booking signal')}
              className="w-full mt-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 font-chinese"
              required
            />
          )}
        </div>

        <div className="bento-card p-4 md:p-5 border-l-4 border-l-blue-500 animate-scale-in">
          <div className="flex items-center gap-3 mb-3">
            <Hourglass className="text-blue-500" size={18} />
            <div className="min-w-0">
              <h4 className="text-base font-semibold font-chinese text-gray-900 dark:text-slate-100">
                {tr('预约时长', 'Booking duration')}
              </h4>
              <p className="text-[11px] font-mono text-gray-500">{tr('预约时长', 'BOOKING DURATION')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <select
              id="auxiliary-duration"
              name="auxiliaryDuration"
              value={form.isCustomAuxiliaryDuration ? 'custom' : form.auxiliaryDuration}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  form.setIsCustomAuxiliaryDuration(true);
                  form.setAuxiliaryDuration(25);
                } else {
                  form.setIsCustomAuxiliaryDuration(false);
                  form.setAuxiliaryDuration(Number(e.target.value));
                }
              }}
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 font-chinese"
              required
            >
              {AUXILIARY_DURATION_PRESETS.map((preset) => (
                <option
                  key={preset}
                  value={preset}
                  className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700"
                >
                  {tr(`${preset}分钟`, `${preset} min`)}
                </option>
              ))}
              <option value="custom" className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">
                {tr('自定义时长', 'Custom duration')}
              </option>
            </select>

            {form.isCustomAuxiliaryDuration && (
              <SliderContainer
                label={tr('自定义预约时长', 'Custom booking duration')}
                description={tr('设置预约阶段的持续时间', 'Set how long the booking phase lasts')}
                orientation="horizontal"
                showKeyboardInput={true}
                keyboardInputProps={{
                  value: form.auxiliaryDuration,
                  onChange: form.setAuxiliaryDuration,
                  min: 1,
                  max: 120,
                  unit: tr('分钟', 'min'),
                  placeholder: tr('输入时长', 'Enter duration'),
                }}
              >
                <PureDOMSlider
                  id="auxiliary-duration-slider"
                  name="auxiliaryDurationSlider"
                  min={1}
                  max={120}
                  initialValue={form.auxiliaryDuration}
                  onValueChange={form.setAuxiliaryDuration}
                  valueFormatter={(v) => tr(`${v}分钟`, `${v} min`)}
                  debounceMs={50}
                  showValue={true}
                />
              </SliderContainer>
            )}
          </div>
        </div>

        <div className="bento-card p-4 md:p-5 border-l-4 border-l-blue-500 animate-scale-in md:col-span-2">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="text-blue-500" size={18} />
            <div className="min-w-0">
              <h4 className="text-base font-semibold font-chinese text-gray-900 dark:text-slate-100">
                {tr('预约完成条件', 'Booking completion condition')}
              </h4>
              <p className="text-[11px] font-mono text-gray-500">{tr('完成条件', 'COMPLETION CONDITION')}</p>
            </div>
          </div>

          <input
            type="text"
            id="auxiliary-completion-trigger"
            name="auxiliaryCompletionTrigger"
            value={getTriggerLabel(form.auxiliaryCompletionTrigger, language)}
            onChange={(e) => form.setAuxiliaryCompletionTrigger(e.target.value)}
            placeholder={tr('例如：打开编程软件、坐到书房书桌前', 'e.g. Open your IDE, sit at your desk')}
            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 font-chinese"
            required
          />

          <details className="mt-3 text-xs text-gray-500 dark:text-slate-400">
            <summary className="cursor-pointer font-chinese">{tr('说明', 'Note')}</summary>
            <p className="mt-2 leading-relaxed">
              {tr(
                '这是你在预约时间内必须完成的动作，通常就是主链的“神圣座位”触发器。',
                'This is the action you must complete during booking—usually the main chain’s “Sacred Seat” trigger.'
              )}
            </p>
          </details>
        </div>
      </div>
    </SettingSection>
  );
}
