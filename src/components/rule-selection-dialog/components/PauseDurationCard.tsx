export function PauseDurationCard({
  tr,
  durationMinutes,
  onDurationMinutesChange,
  isIndefinite,
  onIndefiniteChange,
}: {
  tr: (zh: string, en: string) => string;
  durationMinutes?: number;
  onDurationMinutesChange: (value: number | undefined) => void;
  isIndefinite: boolean;
  onIndefiniteChange: (value: boolean) => void;
}) {
  return (
    <div className="mx-6 mt-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-700/50">
      <h3 className="mb-3 font-medium text-gray-900 dark:text-white">
        {tr('暂停时长设置', 'Pause duration')}
      </h3>

      <div className="flex items-center space-x-4">
        <input
          type="number"
          min="1"
          aria-label={tr('暂停时长（分钟）', 'Pause duration in minutes')}
          value={durationMinutes ?? ''}
          onChange={(event) => {
            const raw = event.target.value;
            if (!raw) {
              onDurationMinutesChange(undefined);
              return;
            }

            const parsed = Number.parseInt(raw, 10);
            onDurationMinutesChange(
              Number.isFinite(parsed) ? parsed : undefined,
            );
          }}
          placeholder={tr('输入分钟', 'Minutes')}
          disabled={isIndefinite}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-600"
        />
      </div>

      <div className="mt-2 flex items-center justify-end">
        <label
          htmlFor="isIndefinite"
          className="mr-2 text-sm text-gray-600 dark:text-gray-400"
        >
          {tr('无限时间', 'Indefinite')}
        </label>
        <input
          type="checkbox"
          id="isIndefinite"
          checked={isIndefinite}
          onChange={(event) => {
            const checked = event.target.checked;
            onIndefiniteChange(checked);
            if (checked) {
              onDurationMinutesChange(undefined);
            }
          }}
          className="h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
        />
      </div>
    </div>
  );
}
