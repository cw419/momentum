import { Clock, Crown, Flame, Hourglass, Infinity } from 'lucide-react';
import { PureDOMSlider } from '../../PureDOMSlider';
import { SettingSection } from '../../SettingSection';
import { SliderContainer } from '../../SliderContainer';
import type { ChainEditorFormModel } from '../hooks/useChainEditorForm';
import { CUSTOM_TRIGGER_VALUE, DURATION_PRESETS, TRIGGER_TEMPLATES } from '../constants';
import { useI18n } from '../../../i18n';

interface MainChainSettingsSectionProps {
  form: ChainEditorFormModel;
}

export function MainChainSettingsSection({ form }: MainChainSettingsSectionProps) {
  const { language, tr } = useI18n();

  return (
    <SettingSection
      title={tr('主链设置', 'Main chain')}
      icon={<Flame className="text-primary-500" size={20} />}
      description={tr('配置主要任务的执行参数', 'Configure the main task execution settings')}
    >
      <div className="bento-card border-l-4 border-l-purple-500 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Infinity className="text-purple-500" size={18} />
            <div>
              <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">{tr('无时长任务', 'No timer')}</h4>
              <p className="text-xs font-mono text-gray-500">{tr('无时长任务', 'DURATIONLESS TASK')}</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDurationless}
              onChange={(e) => form.setIsDurationless(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-500"></div>
          </label>
        </div>
        <p className="text-xs text-gray-600 dark:text-slate-400 font-chinese">
          {tr(
            '开启后，本任务不会倒计时，你可以在专注模式中自行点击“完成任务”结束。',
            'When enabled, this task will not count down. In Focus Mode, you can end it by tapping “Complete task”.'
          )}
        </p>
      </div>

      {form.isDurationless && (
        <div className="bento-card border-l-4 border-l-indigo-500 animate-scale-in">
          <div className="flex items-center space-x-3 mb-4">
            <Hourglass className="text-indigo-500" size={18} />
            <div>
              <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">{tr('最小时长', 'Minimum duration')}</h4>
              <p className="text-xs font-mono text-gray-500">{tr('最小时长', 'MINIMUM DURATION')}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 font-chinese mb-4">
            {tr('设置最小时长后，达到时间后会出现提前完成按钮', 'Once the minimum is reached, you can complete early.')}
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  form.setMinimumDuration(preset);
                  form.setIsCustomMinimumDuration(false);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-chinese transition-all duration-300 ${
                  form.minimumDuration === preset && !form.isCustomMinimumDuration
                    ? 'bg-indigo-500 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                }`}
              >
                {tr(`${preset}分钟`, `${preset} min`)}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="number"
                min="1"
                max="480"
                step="1"
                value={form.isCustomMinimumDuration ? form.minimumDuration : ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    form.setMinimumDuration(value);
                      form.setIsCustomMinimumDuration(true);
                  }
                }}
                placeholder={tr('自定义分钟数', 'Custom minutes')}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 font-chinese"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                form.setMinimumDuration(0);
                form.setIsCustomMinimumDuration(false);
              }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              {tr('不设置', 'Clear')}
            </button>
          </div>
        </div>
      )}

      <div className="bento-card border-l-4 border-l-primary-500 animate-scale-in">
        <div className="flex items-center space-x-3 mb-4">
          <Crown className="text-primary-500" size={18} />
          <div>
            <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">{tr('神圣座位', 'Sacred Seat')}</h4>
            <p className="text-xs font-mono text-gray-500">{tr('神圣座位触发器', 'SACRED SEAT TRIGGER')}</p>
          </div>
        </div>
        <select
          id="sacred-seat-trigger"
          name="sacredSeatTrigger"
          value={form.trigger}
          onChange={(e) => form.handleTriggerSelect(e.target.value)}
          className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 mb-4 font-chinese"
          required
        >
          <option value="" disabled className="text-gray-400">
            {tr('选择触发动作', 'Choose a trigger')}
          </option>
          {TRIGGER_TEMPLATES.map((template, index) => (
            <option
              key={index}
              value={template.value}
              className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700"
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
            placeholder={tr('输入你的自定义触发动作', 'Enter your custom trigger')}
            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
            required
          />
        )}
      </div>

      {!form.isDurationless && (
        <div className="bento-card border-l-4 border-l-primary-500 animate-scale-in">
          <div className="flex items-center space-x-3 mb-4">
            <Clock className="text-primary-500" size={20} />
            <div>
              <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">{tr('任务时长', 'Task duration')}</h4>
              <p className="text-xs font-mono text-gray-500">{tr('任务时长', 'TASK DURATION')}</p>
            </div>
          </div>
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
            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 mb-4 font-chinese"
            required
          >
            {DURATION_PRESETS.map((preset) => (
              <option key={preset} value={preset} className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">
                {tr(`${preset}分钟`, `${preset} min`)}
              </option>
            ))}
            <option value="custom" className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">
              {tr('自定义时长', 'Custom duration')}
            </option>
          </select>
          {form.isCustomDuration && (
            <SliderContainer
              label={tr('自定义时长', 'Custom duration')}
              description={tr('拖动滑块或使用键盘输入设置任务时长', 'Drag the slider or use keyboard input to set the duration')}
              orientation="vertical"
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
    </SettingSection>
  );
}
