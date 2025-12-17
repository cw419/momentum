import { Clock, Crown, Flame, Hourglass, Infinity } from 'lucide-react';
import { PureDOMSlider } from '../../PureDOMSlider';
import { SettingSection } from '../../SettingSection';
import { SliderContainer } from '../../SliderContainer';
import type { ChainEditorFormModel } from '../hooks/useChainEditorForm';
import { DURATION_PRESETS, TRIGGER_TEMPLATES } from '../constants';

interface MainChainSettingsSectionProps {
  form: ChainEditorFormModel;
}

export function MainChainSettingsSection({ form }: MainChainSettingsSectionProps) {
  return (
    <SettingSection
      title="主链设置"
      icon={<Flame className="text-primary-500" size={20} />}
      description="配置主要任务的执行参数"
    >
      <div className="bento-card border-l-4 border-l-purple-500 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Infinity className="text-purple-500" size={18} />
            <div>
              <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">无时长任务</h4>
              <p className="text-xs font-mono text-gray-500">DURATIONLESS TASK</p>
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
          开启后，本任务不会倒计时，你可以在专注模式中自行点击&quot;完成任务&quot;结束。
        </p>
      </div>

      {form.isDurationless && (
        <div className="bento-card border-l-4 border-l-indigo-500 animate-scale-in">
          <div className="flex items-center space-x-3 mb-4">
            <Hourglass className="text-indigo-500" size={18} />
            <div>
              <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">最小时长</h4>
              <p className="text-xs font-mono text-gray-500">MINIMUM DURATION</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 font-chinese mb-4">
            设置最小时长后，达到时间后会出现提前完成按钮
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
                {preset}分钟
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
                placeholder="自定义分钟数"
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
              不设置
            </button>
          </div>
        </div>
      )}

      <div className="bento-card border-l-4 border-l-primary-500 animate-scale-in">
        <div className="flex items-center space-x-3 mb-4">
          <Crown className="text-primary-500" size={18} />
          <div>
            <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">神圣座位</h4>
            <p className="text-xs font-mono text-gray-500">SACRED SEAT TRIGGER</p>
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
            选择触发动作
          </option>
          {TRIGGER_TEMPLATES.map((template, index) => (
            <option key={index} value={template.text} className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">
              {template.text}
            </option>
          ))}
        </select>
        {form.trigger === '自定义触发器' && (
          <input
            type="text"
            id="custom-trigger"
            name="customTrigger"
            value={form.customTrigger}
            onChange={(e) => form.setCustomTrigger(e.target.value)}
            placeholder="输入你的自定义触发动作"
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
              <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">任务时长</h4>
              <p className="text-xs font-mono text-gray-500">TASK DURATION</p>
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
                {preset}分钟
              </option>
            ))}
            <option value="custom" className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">
              自定义时长
            </option>
          </select>
          {form.isCustomDuration && (
            <SliderContainer
              label="自定义时长"
              description="拖动滑块或使用键盘输入设置任务时长"
              orientation="vertical"
              showKeyboardInput={true}
              keyboardInputProps={{
                value: form.duration,
                onChange: form.setDuration,
                min: 1,
                max: 300,
                unit: '分钟',
                placeholder: '输入时长',
              }}
            >
              <PureDOMSlider
                id="duration-slider"
                name="durationSlider"
                min={1}
                max={300}
                initialValue={form.duration}
                onValueChange={form.setDuration}
                valueFormatter={(v) => `${v}分钟`}
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
