import { Hourglass } from 'lucide-react';
import type { ChainEditorFormModel } from '../../hooks/useChainEditorForm';
import { DURATION_PRESETS } from '../../constants';

export function MinimumDurationSettings({
  form,
  tr: translate,
}: {
  form: ChainEditorFormModel;
  tr: (zh: string, en: string) => string;
}) {
  return (
    <div className="space-y-3">
      <p className="font-chinese text-xs leading-relaxed text-gray-600 dark:text-slate-400">
        {translate(
          '开启后，本任务不会倒计时，你可以在专注模式中自行点击“完成任务”结束。',
          'When enabled, this task will not count down. In Focus Mode, you can end it by tapping “Complete task”.',
        )}
      </p>
      <details className="rounded-2xl border border-gray-200/70 bg-gray-50/70 p-3 dark:border-slate-600/60 dark:bg-slate-700/40">
        <summary
          aria-label={translate('最小时长', 'Minimum duration')}
          className="cursor-pointer font-chinese text-sm text-gray-800 dark:text-slate-100"
        >
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Hourglass
                className="text-indigo-500"
                size={16}
                aria-hidden="true"
              />
              <span className="font-medium">
                {translate('最小时长', 'Minimum duration')}
              </span>
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-300">
              {form.minimumDuration > 0
                ? translate(
                    `${form.minimumDuration}分钟`,
                    `${form.minimumDuration} min`,
                  )
                : translate('未设置', 'Not set')}
            </span>
          </span>
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
                {translate(`${preset}分钟`, `${preset} min`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="custom-minimum-duration" className="sr-only">
              {translate('自定义分钟数', 'Custom minutes')}
            </label>
            <input
              id="custom-minimum-duration"
              name="customMinimumDuration"
              aria-label={translate('自定义分钟数', 'Custom minutes')}
              type="number"
              min="1"
              max="480"
              step="1"
              value={form.isCustomMinimumDuration ? form.minimumDuration : ''}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value);
                if (Number.isFinite(value) && value > 0) {
                  form.setMinimumDuration(value);
                  form.setIsCustomMinimumDuration(true);
                }
              }}
              placeholder={translate('自定义分钟数', 'Custom minutes')}
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
              {translate('不设置', 'Clear')}
            </button>
          </div>
          <p className="font-chinese text-xs text-gray-500 dark:text-slate-400">
            {translate(
              '设置最小时长后，达到时间后会出现提前完成按钮。',
              'Once the minimum is reached, you can complete early.',
            )}
          </p>
        </div>
      </details>
    </div>
  );
}
