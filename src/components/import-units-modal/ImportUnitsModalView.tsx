import { Import, Search, X } from 'lucide-react';
import type { Chain } from '../../types';
import { DialogShell } from '../shared/DialogShell';
import { ImportModeOption } from './ImportModeOption';
import { ImportUnitOption } from './ImportUnitOption';
import type { ImportMode } from './useImportUnitsController';

interface ImportUnitsModalViewProps {
  units: Chain[];
  selectedUnits: Set<string>;
  searchTerm: string;
  importMode: ImportMode;
  language: 'zh' | 'en';
  selectionSummary: string;
  onSearchChange: (value: string) => void;
  onModeChange: (mode: ImportMode) => void;
  onToggleUnit: (unitId: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  tr: (zh: string, en: string) => string;
}

export function ImportUnitsModalView(props: ImportUnitsModalViewProps) {
  const { tr: translate } = props;

  return (
    <DialogShell
      titleId="import-units-title"
      descriptionId="import-units-description"
      onClose={props.onClose}
      className="w-full max-w-4xl animate-scale-in overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-slate-600 dark:bg-slate-800"
    >
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10">
            <Import className="text-blue-500" size={24} aria-hidden="true" />
          </div>
          <div>
            <h2
              id="import-units-title"
              className="font-chinese text-2xl font-bold text-gray-900 dark:text-slate-100"
            >
              {translate('导入任务单元', 'Import units')}
            </h2>
            <p
              id="import-units-description"
              className="font-mono text-sm tracking-wide text-gray-500"
            >
              {translate(
                '选择要复制或移动到任务群的单元',
                'Select units to copy or move into this group',
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={props.onClose}
          aria-label={translate('关闭', 'Close')}
          className="focus-ring rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <fieldset className="mb-6">
        <legend className="mb-4 font-chinese text-lg font-bold text-gray-900 dark:text-slate-100">
          {translate('导入模式', 'Import mode')}
        </legend>
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
          <ImportModeOption
            mode="copy"
            selectedMode={props.importMode}
            label={translate('复制模式', 'Copy')}
            description={translate(
              '创建副本加入任务群，原单元保持独立',
              'Create a copy in the group; keep the original unit independent',
            )}
            tone="blue"
            onChange={props.onModeChange}
          />
          <ImportModeOption
            mode="move"
            selectedMode={props.importMode}
            label={translate('移动模式', 'Move')}
            description={translate(
              '将单元移入任务群，不再独立显示',
              'Move the unit into the group; it will no longer appear independently',
            )}
            tone="green"
            onChange={props.onModeChange}
          />
        </div>
      </fieldset>
      <div className="relative mb-6">
        <label htmlFor="import-units-search" className="sr-only">
          {translate('搜索任务单元', 'Search units')}
        </label>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          size={20}
          aria-hidden="true"
        />
        <input
          id="import-units-search"
          name="importUnitsSearch"
          data-dialog-initial-focus
          type="search"
          value={props.searchTerm}
          onChange={(event) => props.onSearchChange(event.target.value)}
          placeholder={translate('搜索任务单元...', 'Search units...')}
          className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-12 pr-4 font-chinese text-gray-900 placeholder-gray-400 transition duration-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
        />
      </div>
      <div className="mb-8 max-h-96 space-y-4 overflow-y-auto">
        {props.units.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-slate-400">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-100 dark:bg-slate-700">
              <Import size={24} className="text-gray-400" aria-hidden="true" />
            </div>
            <p className="font-chinese text-lg">
              {translate(
                '没有找到可导入的任务单元',
                'No importable units found',
              )}
            </p>
            <p className="mt-2 font-mono text-sm text-gray-400 dark:text-slate-500">
              {props.searchTerm
                ? translate('尝试调整搜索条件', 'Try adjusting your search')
                : translate(
                    '所有单元都已在任务群中',
                    'All units are already in a group',
                  )}
            </p>
          </div>
        ) : (
          props.units.map((unit) => (
            <ImportUnitOption
              key={unit.id}
              unit={unit}
              selected={props.selectedUnits.has(unit.id)}
              language={props.language}
              onToggle={() => props.onToggleUnit(unit.id)}
              tr={translate}
            />
          ))
        )}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-chinese text-sm text-gray-600 dark:text-slate-400">
          {props.selectionSummary}
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={props.onClose}
            className="focus-ring rounded-2xl bg-gray-100 px-6 py-3 font-chinese font-medium text-gray-700 transition duration-300 hover:scale-105 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            {translate('取消', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={props.onSubmit}
            disabled={props.selectedUnits.size === 0}
            className="focus-ring rounded-2xl bg-blue-500 px-6 py-3 font-chinese font-medium text-white shadow-lg transition duration-300 hover:scale-105 hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:scale-100"
          >
            {translate('导入', 'Import')}{' '}
            {props.selectedUnits.size > 0 && `(${props.selectedUnits.size})`}
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
