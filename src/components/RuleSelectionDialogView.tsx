import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Search, X } from 'lucide-react';
import type { ExceptionRule, SessionContext } from '../types';
import type { SearchResult } from '../utils/ruleSearchOptimizer';
import { VirtualizedRuleList } from './VirtualizedRuleList';

type ActionType = 'pause' | 'early_completion';

interface RuleSelectionDialogViewProps {
  actionType: ActionType;
  sessionContext: SessionContext;
  language: string;
  tr: (zh: string, en: string) => string;

  containerRef: React.RefObject<HTMLDivElement>;
  searchInputRef: React.RefObject<HTMLInputElement>;

  searchQuery: string;
  onSearchQueryChange: (value: string) => void;

  searchResults: SearchResult[];
  isLoading: boolean;

  error: string | null;
  onDismissError: () => void;

  durationMinutes?: number;
  onDurationMinutesChange: (value: number | undefined) => void;
  isIndefinite: boolean;
  onIsIndefiniteChange: (value: boolean) => void;

  onCancel: () => void;
  onSelectRule: (rule: ExceptionRule) => void;
  onCreateNewRule: (name: string) => void;
}

function getActionDisplayName(actionType: ActionType, tr: (zh: string, en: string) => string): string {
  return actionType === 'pause' ? tr('暂停计时', 'Pause timer') : tr('提前完成', 'Early completion');
}

function getActionColorClass(actionType: ActionType): string {
  return actionType === 'pause'
    ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-green-600 dark:text-green-400';
}

function getActionBgClass(actionType: ActionType): string {
  return actionType === 'pause'
    ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30'
    : 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30';
}

function DialogHeader({
  actionType,
  tr,
  language,
  onCancel,
}: {
  actionType: ActionType;
  tr: (zh: string, en: string) => string;
  language: string;
  onCancel: () => void;
}) {
  const actionColor = getActionColorClass(actionType);
  const actionBg = getActionBgClass(actionType);
  const actionLabel = getActionDisplayName(actionType, tr);

  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${actionBg}`}>
          {actionType === 'pause' ? <Clock className={actionColor} size={20} /> : <CheckCircle className={actionColor} size={20} />}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            <span id="rule-selection-dialog-title">{tr('选择例外规则', 'Choose exception rule')}</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'zh' ? `为${actionLabel}操作选择适用的规则` : `Choose a rule for ${actionLabel}`}
          </p>
        </div>
      </div>

      <button
        onClick={onCancel}
        aria-label={tr('关闭对话框', 'Close dialog')}
        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
      >
        <X size={20} />
      </button>
    </div>
  );
}

function ChainInfoCard({
  actionType,
  sessionContext,
  language,
}: {
  actionType: ActionType;
  sessionContext: SessionContext;
  language: string;
}) {
  const actionBg = getActionBgClass(actionType);
  const actionColor = getActionColorClass(actionType);

  return (
    <div className={`mx-6 mt-4 p-4 rounded-2xl border ${actionBg}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">{sessionContext.chainName}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {language === 'zh'
              ? `已进行 ${Math.floor(sessionContext.elapsedTime / 60)} 分钟`
              : `Elapsed ${Math.floor(sessionContext.elapsedTime / 60)} min`}
            {sessionContext.remainingTime && (
              <span>
                {language === 'zh'
                  ? `，剩余 ${Math.floor(sessionContext.remainingTime / 60)} 分钟`
                  : `, ${Math.floor(sessionContext.remainingTime / 60)} min remaining`}
              </span>
            )}
          </p>
        </div>
        <div className={`text-2xl font-mono ${actionColor}`}>
          {Math.floor(sessionContext.elapsedTime / 60)}:{(sessionContext.elapsedTime % 60).toString().padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}

function PauseDurationCard({
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
      <h3 className="font-medium text-gray-900 dark:text-white mb-3">{tr('暂停时长设置', 'Pause duration')}</h3>

      <div className="flex items-center space-x-4">
        <input
          type="number"
          min="1"
          value={durationMinutes ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
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
          onChange={(e) => {
            const checked = e.target.checked;
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

function ErrorBanner({
  tr,
  error,
  onDismiss,
}: {
  tr: (zh: string, en: string) => string;
  error: string;
  onDismiss: () => void;
}) {
  return (
    <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl flex items-center space-x-3">
      <AlertTriangle className="text-red-500" size={20} />
      <span className="text-red-700 dark:text-red-300 flex-1">{error}</span>
      <button
        onClick={onDismiss}
        aria-label={tr('关闭错误提示', 'Dismiss error')}
        className="text-red-500 hover:text-red-700"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function SearchBar({
  tr,
  searchInputRef,
  value,
  onChange,
}: {
  tr: (zh: string, en: string) => string;
  searchInputRef: React.RefObject<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
      <input
        ref={searchInputRef}
        type="text"
        placeholder={tr('搜索规则或输入新规则名称...', 'Search rules or type a new rule name...')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );
}

function DialogFooter({
  language,
  tr,
  count,
  onCancel,
}: {
  language: string;
  tr: (zh: string, en: string) => string;
  count: number;
  onCancel: () => void;
}) {
  return (
    <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {language === 'zh'
            ? `${count} 个可用规则`
            : `${count} available rule${count === 1 ? '' : 's'}`}
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          {tr('取消操作', 'Cancel')}
        </button>
      </div>
    </div>
  );
}

export const RuleSelectionDialogView: React.FC<RuleSelectionDialogViewProps> = ({
  actionType,
  sessionContext,
  language,
  tr,
  containerRef,
  searchInputRef,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  isLoading,
  error,
  onDismissError,
  durationMinutes,
  onDurationMinutesChange,
  isIndefinite,
  onIsIndefiniteChange,
  onCancel,
  onSelectRule,
  onCreateNewRule,
}) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rule-selection-dialog-title"
      className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      style={{ maxWidth: 'min(640px, 100vw - 2rem)' }}
    >
      <DialogHeader actionType={actionType} tr={tr} language={language} onCancel={onCancel} />

      <div className="flex-shrink-0">
        <ChainInfoCard actionType={actionType} sessionContext={sessionContext} language={language} />

        {actionType === 'pause' && (
          <PauseDurationCard
            tr={tr}
            durationMinutes={durationMinutes}
            onDurationMinutesChange={onDurationMinutesChange}
            isIndefinite={isIndefinite}
            onIndefiniteChange={onIsIndefiniteChange}
          />
        )}

        {error && <ErrorBanner tr={tr} error={error} onDismiss={onDismissError} />}
      </div>

      <div className="flex-1 overflow-y-auto" data-scroll-container>
        <div className="p-6">
          <SearchBar
            tr={tr}
            searchInputRef={searchInputRef}
            value={searchQuery}
            onChange={onSearchQueryChange}
          />

          <VirtualizedRuleList
            rules={searchResults}
            onSelect={(rule) => onSelectRule(rule)}
            onCreateNew={searchQuery.trim() ? (name) => onCreateNewRule(name) : undefined}
            searchQuery={searchQuery}
            isLoading={isLoading}
            itemHeight={60}
            containerHeight={300}
          />
        </div>
      </div>

      <DialogFooter language={language} tr={tr} count={searchResults.length} onCancel={onCancel} />
    </div>
  </div>
);
