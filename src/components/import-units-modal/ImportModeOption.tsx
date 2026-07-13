import type { ImportMode } from './useImportUnitsController';

interface ImportModeOptionProps {
  mode: ImportMode;
  selectedMode: ImportMode;
  label: string;
  description: string;
  tone: 'blue' | 'green';
  onChange: (mode: ImportMode) => void;
}

export function ImportModeOption({
  mode,
  selectedMode,
  label,
  description,
  tone,
  onChange,
}: ImportModeOptionProps) {
  const labelClass =
    tone === 'blue'
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-green-600 dark:text-green-400';

  return (
    <label
      htmlFor={`import-mode-${mode}`}
      className="flex cursor-pointer items-center space-x-3"
    >
      <input
        id={`import-mode-${mode}`}
        type="radio"
        aria-label={label}
        name="importMode"
        value={mode}
        checked={selectedMode === mode}
        onChange={() => onChange(mode)}
        className="h-5 w-5 text-blue-500 focus:ring-2 focus:ring-blue-500"
      />
      <span>
        <span className={`font-chinese font-medium ${labelClass}`}>
          {label}
        </span>
        <span className="block font-chinese text-sm text-gray-600 dark:text-slate-400">
          {description}
        </span>
      </span>
    </label>
  );
}
