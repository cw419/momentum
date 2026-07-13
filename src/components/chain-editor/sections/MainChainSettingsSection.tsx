import {
  Clock,
  Crown,
  Flame,
  Hourglass,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { PureDOMSlider } from '../../PureDOMSlider';
import { SettingSection } from '../../SettingSection';
import { SliderContainer } from '../../SliderContainer';
import type { ChainEditorFormModel } from '../hooks/useChainEditorForm';
import {
  CUSTOM_TRIGGER_VALUE,
  DURATION_PRESETS,
  TRIGGER_TEMPLATES,
} from '../constants';
import { useI18n } from '../../../i18n';

export function MainChainSettingsSection({
  form,
}: {
  form: ChainEditorFormModel;
}) {
  const { language, tr } = useI18n();

  return (
    <SettingSection
      title={tr('主链设置', 'Main chain')}
      icon={<Flame className="text-primary-500" size={20} />}
      description={tr(
        '配置主要任务的执行参数',
        'Configure the main task execution settings',
      )}
    >
      <div className="grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white/90 shadow-sm dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800/80 md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="animate-scale-in p-5 md:p-6">
          <div className="mb-3 flex items-center gap-3">
            <Crown className="text-primary-500" size={18} />
            <div className="min-w-0">
              <h4 className="font-chinese text-base font-semibold text-gray-900 dark:text-slate-100">
                {tr('神圣座位', 'Sacred Seat')}
              </h4>
              <p className="font-chinese text-sm text-gray-500 dark:text-slate-400">
                {tr(
                  '选择开始这项任务的明确信号',
                  'Choose a clear signal that starts this task',
                )}
              </p>
            </div>
          </div>

          <select
            id="sacred-seat-trigger"
            name="sacredSeatTrigger"
            value={form.trigger}
            onChange={(e) => form.handleTriggerSelect(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 font-chinese text-gray-900 transition duration-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            required
          >
            <option value="" disabled className="text-gray-400">
              {tr('选择触发动作', 'Choose a trigger')}
            </option>
            {TRIGGER_TEMPLATES.map((template, index) => (
              <option
                key={index}
                value={template.value}
                className="bg-white text-gray-900 dark:bg-slate-700 dark:text-slate-100"
              >
                {template.label[language]}
              </option>
            ))}
          </select>

          {form.trigger === CUSTOM_TRIGGER_VALUE && (
            <input
              type="text"
              id="custom-trigger"
              name="customTrigger"
              value={form.customTrigger}
              onChange={(e) => form.setCustomTrigger(e.target.value)}
              placeholder={tr(
                '输入你的自定义触发动作',
                'Enter your custom trigger',
              )}
              className="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 font-chinese text-gray-900 placeholder-gray-400 transition duration-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
              required
            />
          )}
        </div>

        <div className="animate-scale-in p-5 md:p-6">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Clock className="text-primary-500" size={20} />
              <div className="min-w-0">
                <h4 className="font-chinese text-base font-semibold text-gray-900 dark:text-slate-100">
                  {tr('任务时长', 'Task duration')}
                </h4>
                <p className="font-chinese text-sm text-gray-500 dark:text-slate-400">
                  {tr(
                    '设置一个可执行的时间边界',
                    'Set a practical time boundary',
                  )}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="flex items-center gap-2 font-chinese text-xs text-gray-600 dark:text-slate-300">
                <InfinityIcon className="text-purple-500" size={16} />
                <span className="whitespace-nowrap">
                  {tr('无时长任务', 'No timer')}
                </span>
              </div>
              <label
                className="relative inline-flex cursor-pointer items-center"
                aria-label={tr('无时长任务', 'No timer')}
              >
                <input
                  type="checkbox"
                  checked={form.isDurationless}
                  onChange={(e) => form.setIsDurationless(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition after:content-[''] peer-checked:bg-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-purple-800" />
              </label>
            </div>
          </div>

          {!form.isDurationless && (
            <div className="space-y-4">
              <select
                id="task-duration"
                name="taskDuration"
                value={form.isCustomDuration ? 'custom' : form.duration}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    form.setIsCustomDuration(true);
                    form.setDuration(60);
                  } else {
                    form.setIsCustomDuration(false);
                    form.setDuration(Number(e.target.value));
                  }
                }}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 font-chinese text-gray-900 transition duration-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                required
              >
                {DURATION_PRESETS.map((preset) => (
                  <option
                    key={preset}
                    value={preset}
                    className="bg-white text-gray-900 dark:bg-slate-700 dark:text-slate-100"
                  >
                    {tr(`${preset}分钟`, `${preset} min`)}
                  </option>
                ))}
                <option
                  value="custom"
                  className="bg-white text-gray-900 dark:bg-slate-700 dark:text-slate-100"
                >
                  {tr('自定义时长', 'Custom duration')}
                </option>
              </select>

              {form.isCustomDuration && (
                <SliderContainer
                  label={tr('自定义时长', 'Custom duration')}
                  description={tr(
                    '拖动滑块或使用键盘输入设置任务时长',
                    'Drag the slider or use keyboard input to set the duration',
                  )}
                  orientation="horizontal"
                  showKeyboardInput={true}
                  keyboardInputProps={{
                    value: form.duration,
                    onChange: form.setDuration,
                    min: 1,
                    max: 300,
                    unit: tr('分钟', 'min'),
                    placeholder: tr('输入时长', 'Enter duration'),
                  }}
                >
                  <PureDOMSlider
                    id="duration-slider"
                    name="durationSlider"
                    min={1}
                    max={300}
                    initialValue={form.duration}
                    onValueChange={form.setDuration}
                    valueFormatter={(v) => tr(`${v}分钟`, `${v} min`)}
                    debounceMs={50}
                    showValue={true}
                  />
                </SliderContainer>
              )}
            </div>
          )}

          {form.isDurationless && (
            <div className="space-y-3">
              <p className="font-chinese text-xs leading-relaxed text-gray-600 dark:text-slate-400">
                {tr(
                  '开启后，本任务不会倒计时，你可以在专注模式中自行点击“完成任务”结束。',
                  'When enabled, this task will not count down. In Focus Mode, you can end it by tapping “Complete task”.',
                )}
              </p>

              <details className="rounded-2xl border border-gray-200/70 bg-gray-50/70 p-3 dark:border-slate-600/60 dark:bg-slate-700/40">
                <summary
                  aria-label={tr('最小时长', 'Minimum duration')}
                  className="cursor-pointer font-chinese text-sm text-gray-800 dark:text-slate-100"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Hourglass className="text-indigo-500" size={16} />
                      <span className="font-medium">
                        {tr('最小时长', 'Minimum duration')}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-slate-300">
                      {form.minimumDuration > 0
                        ? tr(
                            `${form.minimumDuration}分钟`,
                            `${form.minimumDuration} min`,
                          )
                        : tr('未设置', 'Not set')}
                    </span>
                  </div>
                </summary>

                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {DURATION_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          form.setMinimumDuration(preset);
                          form.setIsCustomMinimumDuration(false);
                        }}
                        className={`rounded-xl px-3 py-1.5 font-chinese text-xs transition duration-200 ${
                          form.minimumDuration === preset &&
                          !form.isCustomMinimumDuration
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'border border-gray-200/60 bg-white/70 text-gray-700 hover:bg-indigo-50 dark:border-slate-600/60 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-indigo-900/30'
                        }`}
                      >
                        {tr(`${preset}分钟`, `${preset} min`)}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="custom-minimum-duration"
                      className="sr-only"
                    >
                      {tr('自定义分钟数', 'Custom minutes')}
                    </label>
                    <input
                      id="custom-minimum-duration"
                      name="customMinimumDuration"
                      aria-label={tr('自定义分钟数', 'Custom minutes')}
                      type="number"
                      min="1"
                      max="480"
                      step="1"
                      value={
                        form.isCustomMinimumDuration ? form.minimumDuration : ''
                      }
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value > 0) {
                          form.setMinimumDuration(value);
                          form.setIsCustomMinimumDuration(true);
                        }
                      }}
                      placeholder={tr('自定义分钟数', 'Custom minutes')}
                      className="flex-1 rounded-2xl border border-gray-200 bg-white/70 px-4 py-2.5 font-chinese text-gray-900 placeholder-gray-400 transition duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        form.setMinimumDuration(0);
                        form.setIsCustomMinimumDuration(false);
                      }}
                      className="rounded-xl px-3 py-2 text-xs text-gray-600 transition-colors hover:text-gray-800 dark:text-slate-300 dark:hover:text-white"
                    >
                      {tr('不设置', 'Clear')}
                    </button>
                  </div>

                  <p className="font-chinese text-xs text-gray-500 dark:text-slate-400">
                    {tr(
                      '设置最小时长后，达到时间后会出现提前完成按钮。',
                      'Once the minimum is reached, you can complete early.',
                    )}
                  </p>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </SettingSection>
  );
}
