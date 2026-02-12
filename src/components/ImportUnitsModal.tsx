import React, { useState } from 'react';
import { X, Import, Search, Clock, Flame, CheckCircle } from 'lucide-react';
import { getChainTypeConfig } from '../utils/chainTree';
import { Icon } from '../utils/iconMap';
import { formatTime } from '../utils/time';
import { useI18n } from '../i18n';
import type { ImportUnitsModalProps } from './ImportUnitsModal.types';

export const ImportUnitsModal: React.FC<ImportUnitsModalProps> = ({
  availableUnits,
  groupId,
  onImport,
  onClose,
}) => {
  const { language, tr } = useI18n();
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [importMode, setImportMode] = useState<'move' | 'copy'>('copy');

  const importModeLabel =
    importMode === 'copy'
      ? { zh: '复制模式', en: 'Copy' }
      : { zh: '移动模式', en: 'Move' };

  const selectionSummary =
    language === 'zh'
      ? `已选择 ${selectedUnits.size} 个任务单元（${importModeLabel.zh}）`
      : `${selectedUnits.size} selected (${importModeLabel.en})`;

  // 过滤可导入的单元（排除群组类型和已经有父节点的单元）
  const importableUnits = availableUnits.filter(
    (unit) =>
      unit.type !== 'group' &&
      !unit.parentId &&
      unit.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleUnitToggle = (unitId: string) => {
    const newSelected = new Set(selectedUnits);
    if (newSelected.has(unitId)) {
      newSelected.delete(unitId);
    } else {
      newSelected.add(unitId);
    }
    setSelectedUnits(newSelected);
  };

  const handleImport = () => {
    if (selectedUnits.size > 0) {
      onImport(Array.from(selectedUnits), groupId, importMode);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl animate-scale-in overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10">
              <Import className="text-blue-500" size={24} />
            </div>
            <div>
              <h2 className="font-chinese text-2xl font-bold text-gray-900 dark:text-slate-100">
                {tr('导入任务单元', 'Import units')}
              </h2>
              <p className="font-mono text-sm tracking-wide text-gray-500">
                {tr('导入任务单元', 'IMPORT TASK UNITS')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr('关闭', 'Close')}
            className="focus-ring rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Import Mode Selection */}
        <div className="mb-6">
          <h3 className="mb-4 font-chinese text-lg font-bold text-gray-900 dark:text-slate-100">
            {tr('导入模式', 'Import mode')}
          </h3>
          <div className="flex space-x-4">
            <label
              className="flex cursor-pointer items-center space-x-3"
              aria-label={tr('复制模式', 'Copy')}
            >
              <input
                type="radio"
                name="importMode"
                value="copy"
                checked={importMode === 'copy'}
                onChange={(e) =>
                  setImportMode(e.target.value as 'move' | 'copy')
                }
                className="h-5 w-5 text-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <span className="font-chinese font-medium text-blue-600 dark:text-blue-400">
                  {tr('复制模式', 'Copy')}
                </span>
                <p className="font-chinese text-sm text-gray-600 dark:text-slate-400">
                  {tr(
                    '创建副本加入任务群，原单元保持独立',
                    'Create a copy in the group; keep the original unit independent',
                  )}
                </p>
              </div>
            </label>
            <label
              className="flex cursor-pointer items-center space-x-3"
              aria-label={tr('移动模式', 'Move')}
            >
              <input
                type="radio"
                name="importMode"
                value="move"
                checked={importMode === 'move'}
                onChange={(e) =>
                  setImportMode(e.target.value as 'move' | 'copy')
                }
                className="h-5 w-5 text-green-500 focus:ring-2 focus:ring-green-500"
              />
              <div>
                <span className="font-chinese font-medium text-green-600 dark:text-green-400">
                  {tr('移动模式', 'Move')}
                </span>
                <p className="font-chinese text-sm text-gray-600 dark:text-slate-400">
                  {tr(
                    '将单元移入任务群，不再独立显示',
                    'Move the unit into the group; it will no longer appear independently',
                  )}
                </p>
              </div>
            </label>
          </div>
        </div>
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <label htmlFor="import-units-search" className="sr-only">
              {tr('搜索任务单元', 'Search units')}
            </label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="text-gray-400" size={20} />
            </div>
            <input
              id="import-units-search"
              name="importUnitsSearch"
              aria-label={tr('搜索任务单元', 'Search units')}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={tr('搜索任务单元...', 'Search units...')}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-12 pr-4 font-chinese text-gray-900 placeholder-gray-400 transition duration-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>
        </div>

        {/* Units List */}
        <div className="mb-8 max-h-96 space-y-4 overflow-y-auto">
          {importableUnits.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-slate-400">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-100 dark:bg-slate-700">
                <Import size={24} className="text-gray-400" />
              </div>
              <p className="font-chinese text-lg">
                {tr('没有找到可导入的任务单元', 'No importable units found')}
              </p>
              <p className="mt-2 font-mono text-sm text-gray-400 dark:text-slate-500">
                {searchTerm
                  ? tr('尝试调整搜索条件', 'Try adjusting your search')
                  : tr(
                      '所有单元都已在任务群中',
                      'All units are already in a group',
                    )}
              </p>
            </div>
          ) : (
            importableUnits.map((unit) => {
              const typeConfig = getChainTypeConfig(unit.type, language);
              const isSelected = selectedUnits.has(unit.id);
              const completionUnit =
                unit.totalCompletions === 1 ? 'completion' : 'completions';
              const completionsText =
                language === 'zh'
                  ? `${unit.totalCompletions} 次完成`
                  : `${unit.totalCompletions} ${completionUnit}`;

              return (
                <button
                  type="button"
                  key={unit.id}
                  aria-label={tr(
                    `选择任务单元：${unit.name}`,
                    `Select unit: ${unit.name}`,
                  )}
                  className={`w-full cursor-pointer rounded-2xl border-2 p-4 text-left transition duration-300 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 bg-white hover:border-blue-300 dark:border-slate-600 dark:bg-slate-700/50 dark:hover:border-blue-600'
                  }`}
                  onClick={() => handleUnitToggle(unit.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-1 items-center space-x-4">
                      {/* Checkbox */}
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-slate-500'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="h-3 w-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Unit Info */}
                      <div className="flex-1">
                        <div className="mb-2 flex items-center space-x-3">
                          <div
                            className={`h-8 w-8 rounded-xl ${typeConfig.bgColor} flex items-center justify-center`}
                          >
                            <Icon
                              name={typeConfig.icon}
                              size={14}
                              className={typeConfig.color}
                            />
                          </div>
                          <div>
                            <h4 className="font-chinese font-bold text-gray-900 dark:text-slate-100">
                              {unit.name}
                            </h4>
                            <p className="font-mono text-xs tracking-wide text-gray-500">
                              {typeConfig.name}
                            </p>
                          </div>
                        </div>
                        <p className="mb-2 font-chinese text-sm text-gray-600 dark:text-slate-400">
                          {unit.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-slate-400">
                          <span className="flex items-center space-x-1">
                            <Clock size={12} />
                            <span>{formatTime(unit.duration, language)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Flame size={12} />
                            <span>#{unit.currentStreak}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <CheckCircle size={12} />
                            <span>{completionsText}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="font-chinese text-sm text-gray-600 dark:text-slate-400">
            {selectionSummary}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="rounded-2xl bg-gray-100 px-6 py-3 font-chinese font-medium text-gray-700 transition duration-300 hover:scale-105 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              {tr('取消', 'Cancel')}
            </button>
            <button
              onClick={handleImport}
              disabled={selectedUnits.size === 0}
              className="rounded-2xl bg-blue-500 px-6 py-3 font-chinese font-medium text-white shadow-lg transition duration-300 hover:scale-105 hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:scale-100"
            >
              {tr('导入', 'Import')}{' '}
              {selectedUnits.size > 0 && `(${selectedUnits.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
