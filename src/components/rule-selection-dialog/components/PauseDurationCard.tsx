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
    <div className="mx-6 mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
      <h3 className="font-medium text-gray-900 dark:text-white mb-3">
        {tr('暂停时长设置', 'Pause duration')}
      </h3>

      <div className="flex items-center space-x-4">
        <input
          type="number"
          min="1"
          value={durationMinutes ?? ''}
          onChange={(event) => {
            const raw = event.target.value;
            if (!raw) {
              onDurationMinutesChange(undefined);
              return;
            }

            const parsed = Number.parseInt(raw, 10);
            onDurationMinutesChange(Number.isFinite(parsed) ? parsed : undefined);
          }}
          placeholder={tr('输入分钟', 'Minutes')}
          disabled={isIndefinite}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-200 dark:disabled:bg-gray-600"
        />
      </div>

      <div className="flex items-center justify-end mt-2">
        <label htmlFor="isIndefinite" className="text-sm text-gray-600 dark:text-gray-400 mr-2">
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
          className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
      </div>
    </div>
  );
}
