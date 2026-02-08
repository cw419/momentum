import React from 'react';
import type { ExceptionRule, SessionContext } from '../../types';
import type { SearchResult } from '../../utils/ruleSearchOptimizer';
import { VirtualizedRuleList } from '../VirtualizedRuleList';
import type { ActionType } from './types';
import { ChainInfoCard } from './components/ChainInfoCard';
import { DialogFooter } from './components/DialogFooter';
import { DialogHeader } from './components/DialogHeader';
import { ErrorBanner } from './components/ErrorBanner';
import { PauseDurationCard } from './components/PauseDurationCard';
import { SearchBar } from './components/SearchBar';

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

export const RuleSelectionDialogView: React.FC<
  RuleSelectionDialogViewProps
> = ({
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
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rule-selection-dialog-title"
      className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-800"
      style={{ maxWidth: 'min(640px, 100vw - 2rem)' }}
    >
      <DialogHeader
        actionType={actionType}
        tr={tr}
        language={language}
        onCancel={onCancel}
      />

      <div className="flex-shrink-0">
        <ChainInfoCard
          actionType={actionType}
          sessionContext={sessionContext}
          language={language}
        />

        {actionType === 'pause' && (
          <PauseDurationCard
            tr={tr}
            durationMinutes={durationMinutes}
            onDurationMinutesChange={onDurationMinutesChange}
            isIndefinite={isIndefinite}
            onIndefiniteChange={onIsIndefiniteChange}
          />
        )}

        {error && (
          <ErrorBanner tr={tr} error={error} onDismiss={onDismissError} />
        )}
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
            onCreateNew={
              searchQuery.trim() ? (name) => onCreateNewRule(name) : undefined
            }
            searchQuery={searchQuery}
            isLoading={isLoading}
            itemHeight={60}
            containerHeight={300}
          />
        </div>
      </div>

      <DialogFooter
        language={language}
        tr={tr}
        count={searchResults.length}
        onCancel={onCancel}
      />
    </div>
  </div>
);
