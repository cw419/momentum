import { Bell, Calendar, CheckCircle, Hourglass } from 'lucide-react';
import { PureDOMSlider } from '../../PureDOMSlider';
import { SettingSection } from '../../SettingSection';
import { SliderContainer } from '../../SliderContainer';
import type { ChainEditorFormModel } from '../hooks/useChainEditorForm';
import { AUXILIARY_DURATION_PRESETS, AUXILIARY_SIGNAL_TEMPLATES } from '../constants';

interface AuxiliaryChainSettingsSectionProps {
  form: ChainEditorFormModel;
}

export function AuxiliaryChainSettingsSection({ form }: AuxiliaryChainSettingsSectionProps) {
  return (
    <SettingSection title="辅助链设置" icon={<Calendar className="text-blue-500" size={20} />} description="配置预约和完成条件">
      <div className="bento-card border-l-4 border-l-blue-500 animate-scale-in">
        <div className="flex items-center space-x-3 mb-4">
          <Bell className="text-blue-500" size={18} />
          <div>
            <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">预约信号</h4>
            <p className="text-xs font-mono text-gray-500">BOOKING SIGNAL</p>
          </div>
        </div>
        <select
          id="auxiliary-signal"
          name="auxiliarySignal"
          value={form.auxiliarySignal}
          onChange={(e) => form.handleAuxiliarySignalSelect(e.target.value)}
          className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 mb-4 font-chinese"
          required
        >
          <option value="" disabled className="text-gray-400">
            选择预约信号
          </option>
          {AUXILIARY_SIGNAL_TEMPLATES.map((template, index) => (
            <option key={index} value={template.text} className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">
              {template.text}
            </option>
          ))}
        </select>
        {form.auxiliarySignal === '自定义信号' && (
          <input
            type="text"
            id="custom-auxiliary-signal"
            name="customAuxiliarySignal"
            value={form.customAuxiliarySignal}
            onChange={(e) => form.setCustomAuxiliarySignal(e.target.value)}
            placeholder="输入你的自定义预约信号"
            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 font-chinese"
            required
          />
        )}
      </div>

      <div className="bento-card border-l-4 border-l-blue-500 animate-scale-in">
        <div className="flex items-center space-x-3 mb-4">
          <Hourglass className="text-blue-500" size={18} />
          <div>
            <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">预约时长</h4>
            <p className="text-xs font-mono text-gray-500">BOOKING DURATION</p>
          </div>
        </div>
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
          className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 mb-4 font-chinese"
          required
        >
          {AUXILIARY_DURATION_PRESETS.map((preset) => (
            <option key={preset} value={preset} className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">
              {preset}分钟
            </option>
          ))}
          <option value="custom" className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">
            自定义时长
          </option>
        </select>
        {form.isCustomAuxiliaryDuration && (
          <SliderContainer
            label="自定义预约时长"
            description="设置预约阶段的持续时间"
            orientation="vertical"
            showKeyboardInput={true}
            keyboardInputProps={{
              value: form.auxiliaryDuration,
              onChange: form.setAuxiliaryDuration,
              min: 1,
              max: 120,
              unit: '分钟',
              placeholder: '输入时长',
            }}
          >
            <PureDOMSlider
              id="auxiliary-duration-slider"
              name="auxiliaryDurationSlider"
              min={1}
              max={120}
              initialValue={form.auxiliaryDuration}
              onValueChange={form.setAuxiliaryDuration}
              valueFormatter={(v) => `${v}分钟`}
              debounceMs={50}
              showValue={true}
            />
          </SliderContainer>
        )}
      </div>

      <div className="bento-card border-l-4 border-l-blue-500 animate-scale-in">
        <div className="flex items-center space-x-3 mb-4">
          <CheckCircle className="text-blue-500" size={18} />
          <div>
            <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">预约完成条件</h4>
            <p className="text-xs font-mono text-gray-500">COMPLETION CONDITION</p>
          </div>
        </div>
        <input
          type="text"
          id="auxiliary-completion-trigger"
          name="auxiliaryCompletionTrigger"
          value={form.auxiliaryCompletionTrigger}
          onChange={(e) => form.setAuxiliaryCompletionTrigger(e.target.value)}
          placeholder="例如：打开编程软件、坐到书房书桌前"
          className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 font-chinese"
          required
        />
        <p className="text-gray-500 text-xs mt-3 leading-relaxed">这是你在预约时间内必须完成的动作，通常就是主链的&quot;神圣座位&quot;触发器</p>
      </div>
    </SettingSection>
  );
}

