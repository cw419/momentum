import React from 'react';
import { Hourglass } from 'lucide-react';

import { SliderContainer } from '../SliderContainer';
import { PureDOMSlider } from '../PureDOMSlider';
import { AUXILIARY_DURATION_PRESETS } from '../chain-editor/constants';

interface DurationSectionProps {
  auxiliaryDuration: number;
  isCustomAuxiliaryDuration: boolean;
  onAuxiliaryDurationChange: (value: number) => void;
  onAuxiliaryDurationModeChange: (isCustom: boolean, value: number) => void;
  tr: (zh: string, en: string) => string;
}

const DurationSectionComponent: React.FC<DurationSectionProps> = ({
  auxiliaryDuration,
  isCustomAuxiliaryDuration,
  onAuxiliaryDurationChange,
  onAuxiliaryDurationModeChange,
  tr,
}) => (
  <div data-testid="task-group-editor-duration" className="bento-card p-4 md:p-5 border-l-4 border-l-blue-500 animate-scale-in">
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
        value={isCustomAuxiliaryDuration ? 'custom' : auxiliaryDuration}
        onChange={(e) => {
          if (e.target.value === 'custom') {
            onAuxiliaryDurationModeChange(true, 25);
          } else {
            onAuxiliaryDurationModeChange(false, Number(e.target.value));
          }
        }}
        className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition duration-300 font-chinese"
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

      {isCustomAuxiliaryDuration && (
        <SliderContainer
          label={tr('自定义预约时长', 'Custom booking duration')}
          description={tr('设置预约阶段的持续时间', 'Set how long the booking phase lasts')}
          orientation="horizontal"
          showKeyboardInput={true}
          keyboardInputProps={{
            value: auxiliaryDuration,
            onChange: onAuxiliaryDurationChange,
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
            initialValue={auxiliaryDuration}
            onValueChange={onAuxiliaryDurationChange}
            valueFormatter={(v) => tr(`${v}分钟`, `${v} min`)}
            debounceMs={50}
            showValue={true}
          />
        </SliderContainer>
      )}

      <p className="text-gray-500 text-xs leading-relaxed">
        {tr('预约阶段的持续时间，用于准备和调整状态', 'How long the booking phase lasts for preparation and alignment')}
      </p>
    </div>
  </div>
);

export const DurationSection = React.memo(DurationSectionComponent);

DurationSection.displayName = 'DurationSection';

