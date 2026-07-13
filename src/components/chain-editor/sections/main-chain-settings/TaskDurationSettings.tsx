import { Clock, Infinity as InfinityIcon } from 'lucide-react';
import { NumericSliderField } from '../../../shared/NumericSliderField';
import type { ChainEditorFormModel } from '../../hooks/useChainEditorForm';
import { DURATION_PRESETS } from '../../constants';
import { MinimumDurationSettings } from './MinimumDurationSettings';

export function TaskDurationSettings({
  form,
  tr: translate,
}: {
  form: ChainEditorFormModel;
  tr: (zh: string, en: string) => string;
}) {
  return (
    <div className="animate-scale-in p-5 md:p-6">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Clock className="text-primary-500" size={20} aria-hidden="true" />
          <div className="min-w-0">
            <h4 className="font-chinese text-base font-semibold text-gray-900 dark:text-slate-100">
              {translate('任务时长', 'Task duration')}
            </h4>
            <p className="font-chinese text-sm text-gray-500 dark:text-slate-400">
              {translate(
                '设置一个可执行的时间边界',
                'Set a practical time boundary',
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2 font-chinese text-xs text-gray-600 dark:text-slate-300">
            <InfinityIcon
              className="text-purple-500"
              size={16}
              aria-hidden="true"
            />
            <span className="whitespace-nowrap">
              {translate('无时长任务', 'No timer')}
            </span>
          </div>
          <label
            className="relative inline-flex cursor-pointer items-center"
            aria-label={translate('无时长任务', 'No timer')}
          >
            <input
              type="checkbox"
              checked={form.isDurationless}
              onChange={(event) => form.setIsDurationless(event.target.checked)}
              className="peer sr-only"
            />
            <span className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition after:content-[''] peer-checked:bg-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-purple-800" />
          </label>
        </div>
      </div>
      {form.isDurationless ? (
        <MinimumDurationSettings form={form} tr={translate} />
      ) : (
        <div className="space-y-4">
          <select
            id="task-duration"
            name="taskDuration"
            value={form.isCustomDuration ? 'custom' : form.duration}
            onChange={(event) => {
              if (event.target.value === 'custom') {
                form.setIsCustomDuration(true);
                form.setDuration(60);
              } else {
                form.setIsCustomDuration(false);
                form.setDuration(Number(event.target.value));
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
                {translate(`${preset}分钟`, `${preset} min`)}
              </option>
            ))}
            <option
              value="custom"
              className="bg-white text-gray-900 dark:bg-slate-700 dark:text-slate-100"
            >
              {translate('自定义时长', 'Custom duration')}
            </option>
          </select>
          {form.isCustomDuration && (
            <NumericSliderField
              id="duration-slider"
              label={translate('自定义时长', 'Custom duration')}
              description={translate(
                '拖动滑块或使用键盘输入设置任务时长',
                'Drag the slider or use keyboard input to set the duration',
              )}
              value={form.duration}
              onChange={form.setDuration}
              min={1}
              max={300}
              unit={translate('分钟', 'min')}
              formatValue={(value) => translate(`${value}分钟`, `${value} min`)}
              debounceMs={50}
            />
          )}
        </div>
      )}
    </div>
  );
}
