/**
 * MigrationDialogView - 纯展示组件
 * 数据迁移对话框的视图层
 */

import React, { memo } from 'react';
import { MigrationResult, MigrationProgress } from '../services/ExceptionRuleMigration';
import {
  Database,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  ArrowRight,
  X,
  Info
} from 'lucide-react';

export interface MigrationSuggestions {
  totalRules: number;
  uniqueRules: string[];
  duplicateRules: Array<{ rule: string; count: number; chains: string[] }>;
  recommendations: string[];
}

export interface MigrationDialogViewProps {
  // 状态
  loading: boolean;
  error: string | null;
  migrationNeeded: boolean | null;
  migrationSuggestions: MigrationSuggestions | null;
  migrating: boolean;
  migrationProgress: MigrationProgress | null;
  migrationResult: MigrationResult | null;
  showDetails: boolean;
  progressPercentage: number;
  phaseDisplayName: string;

  // 事件处理
  onClose: () => void;
  onStartMigration: () => void;
  onDownloadReport: () => void;
  onToggleDetails: () => void;

  // 国际化
  tr: (zh: string, en: string) => string;
}

const MigrationDialogViewComponent: React.FC<MigrationDialogViewProps> = ({
  loading,
  error,
  migrationNeeded,
  migrationSuggestions,
  migrating,
  migrationProgress,
  migrationResult,
  showDetails,
  progressPercentage,
  phaseDisplayName,
  onClose,
  onStartMigration,
  onDownloadReport,
  onToggleDetails,
  tr
}) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="migration-dialog-title"
        className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <DialogHeader
          onClose={onClose}
          migrating={migrating}
          tr={tr}
        />

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]" style={{ overscrollBehavior: 'contain' }}>
          {/* Loading State */}
          {loading && <LoadingState tr={tr} />}

          {/* Error Alert */}
          {error && <ErrorAlert error={error} />}

          {/* No Migration Needed */}
          {!loading && migrationNeeded === false && (
            <NoMigrationNeeded tr={tr} />
          )}

          {/* Migration Needed */}
          {!loading && migrationNeeded === true && !migrating && !migrationResult && migrationSuggestions && (
            <MigrationNeededSection
              suggestions={migrationSuggestions}
              showDetails={showDetails}
              onToggleDetails={onToggleDetails}
              onClose={onClose}
              onStartMigration={onStartMigration}
              tr={tr}
            />
          )}

          {/* Migration In Progress */}
          {migrating && migrationProgress && (
            <MigrationInProgress
              progress={migrationProgress}
              progressPercentage={progressPercentage}
              phaseDisplayName={phaseDisplayName}
              tr={tr}
            />
          )}

          {/* Migration Complete */}
          {migrationResult && (
            <MigrationComplete
              result={migrationResult}
              onDownloadReport={onDownloadReport}
              onClose={onClose}
              tr={tr}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-components

interface DialogHeaderProps {
  onClose: () => void;
  migrating: boolean;
  tr: (zh: string, en: string) => string;
}

const DialogHeader: React.FC<DialogHeaderProps> = ({ onClose, migrating, tr }) => (
  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
        <Database className="text-blue-500" size={20} />
      </div>
      <div>
        <h2 id="migration-dialog-title" className="text-xl font-bold text-gray-900 dark:text-white">
          {tr('数据迁移', 'Data migration')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {tr('将旧的例外规则迁移到新系统', 'Migrate legacy exception rules to the new system')}
        </p>
      </div>
    </div>

    <button
      type="button"
      onClick={onClose}
      disabled={migrating}
      aria-label={tr('关闭', 'Close')}
      className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <X size={20} />
    </button>
  </div>
);

interface LoadingStateProps {
  tr: (zh: string, en: string) => string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ tr }) => (
  <div className="text-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
    <p className="text-gray-600 dark:text-gray-400">{tr('检查迁移需求中...', 'Checking migration status...')}</p>
  </div>
);

interface ErrorAlertProps {
  error: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ error }) => (
  <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl flex items-center space-x-3">
    <AlertTriangle className="text-red-500" size={20} />
    <span className="text-red-700 dark:text-red-300">{error}</span>
  </div>
);

interface NoMigrationNeededProps {
  tr: (zh: string, en: string) => string;
}

const NoMigrationNeeded: React.FC<NoMigrationNeededProps> = ({ tr }) => (
  <div className="text-center py-8">
    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-4">
      <CheckCircle className="text-green-500" size={32} />
    </div>
    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
      {tr('无需迁移', 'No migration needed')}
    </h3>
    <p className="text-gray-600 dark:text-gray-400">
      {tr('您的数据已经是最新格式，无需进行迁移。', 'Your data is already up to date. No migration is required.')}
    </p>
  </div>
);

interface MigrationNeededSectionProps {
  suggestions: MigrationSuggestions;
  showDetails: boolean;
  onToggleDetails: () => void;
  onClose: () => void;
  onStartMigration: () => void;
  tr: (zh: string, en: string) => string;
}

const MigrationNeededSection: React.FC<MigrationNeededSectionProps> = ({
  suggestions,
  showDetails,
  onToggleDetails,
  onClose,
  onStartMigration,
  tr
}) => (
  <div className="space-y-6">
    {/* Summary */}
    <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-2xl p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Info className="text-yellow-600 dark:text-yellow-400" size={20} />
        <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
          {tr('发现需要迁移的数据', 'Migration needed')}
        </h3>
      </div>
      <div className="space-y-3 text-sm text-yellow-700 dark:text-yellow-300">
        <div className="flex justify-between">
          <span>{tr('总规则数：', 'Total rules:')}</span>
          <span className="font-medium">{suggestions.totalRules}</span>
        </div>
        <div className="flex justify-between">
          <span>{tr('唯一规则：', 'Unique rules:')}</span>
          <span className="font-medium">{suggestions.uniqueRules.length}</span>
        </div>
        <div className="flex justify-between">
          <span>{tr('重复规则：', 'Duplicate rules:')}</span>
          <span className="font-medium">{suggestions.duplicateRules.length}</span>
        </div>
      </div>
    </div>

    {/* Recommendations */}
    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-6">
      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
        {tr('迁移建议', 'Recommendations')}
      </h4>
      <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
        {suggestions.recommendations.map((recommendation, index) => (
          <li key={index} className="flex items-start space-x-2">
            <ArrowRight size={16} className="mt-0.5 flex-shrink-0" />
            <span>{recommendation}</span>
          </li>
        ))}
      </ul>
    </div>

    {/* Duplicate Rules Details */}
    {suggestions.duplicateRules.length > 0 && (
      <DuplicateRulesSection
        duplicateRules={suggestions.duplicateRules}
        showDetails={showDetails}
        onToggleDetails={onToggleDetails}
        tr={tr}
      />
    )}

    {/* Action Buttons */}
    <div className="flex items-center justify-end space-x-3">
      <button
        type="button"
        onClick={onClose}
        aria-label={tr('稍后迁移', 'Later')}
        className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
      >
        {tr('稍后迁移', 'Later')}
      </button>
      <button
        type="button"
        onClick={onStartMigration}
        aria-label={tr('开始迁移', 'Start migration')}
        className="px-6 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white transition-colors flex items-center space-x-2"
      >
        <Database size={16} />
        <span>{tr('开始迁移', 'Start migration')}</span>
      </button>
    </div>
  </div>
);

interface DuplicateRulesSectionProps {
  duplicateRules: Array<{ rule: string; count: number; chains: string[] }>;
  showDetails: boolean;
  onToggleDetails: () => void;
  tr: (zh: string, en: string) => string;
}

const DuplicateRulesSection: React.FC<DuplicateRulesSectionProps> = ({
  duplicateRules,
  showDetails,
  onToggleDetails,
  tr
}) => (
  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
    <div className="flex items-center justify-between mb-4">
      <h4 className="font-medium text-gray-900 dark:text-white">
        {tr('重复规则详情', 'Duplicate rule details')}
      </h4>
      <button
        type="button"
        onClick={onToggleDetails}
        aria-expanded={showDetails}
        aria-label={showDetails ? tr('收起重复规则详情', 'Collapse duplicate rule details') : tr('展开重复规则详情', 'Expand duplicate rule details')}
        className="text-sm text-primary-500 hover:text-primary-600"
      >
        {showDetails ? tr('收起', 'Collapse') : tr('展开', 'Expand')}
      </button>
    </div>

    {showDetails && (
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {duplicateRules.slice(0, 10).map((duplicate, index) => {
          const moreCount = Math.max(0, duplicate.chains.length - 3);
          return (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {duplicate.rule}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {tr('使用于', 'Used in')}: {duplicate.chains.slice(0, 3).join(', ')}
                  {moreCount > 0 && tr(` 等${moreCount}个任务`, ` and ${moreCount} more`)}
                </div>
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {tr(`${duplicate.count}次`, `${duplicate.count}x`)}
              </span>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

interface MigrationInProgressProps {
  progress: MigrationProgress;
  progressPercentage: number;
  phaseDisplayName: string;
  tr: (zh: string, en: string) => string;
}

const MigrationInProgress: React.FC<MigrationInProgressProps> = ({
  progress,
  progressPercentage,
  phaseDisplayName,
  tr
}) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
        <RefreshCw className="text-primary-500 animate-spin" size={32} />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {tr('正在迁移数据', 'Migrating data')}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        {progress.message}
      </p>
    </div>

    {/* Progress Bar */}
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          {phaseDisplayName}
        </span>
        <span className="text-gray-600 dark:text-gray-400">
          {progressPercentage}%
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 transition-[width] duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      {progress.totalChains > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {progress.currentChain} / {progress.totalChains}
          {progress.currentChainName && ` - ${progress.currentChainName}`}
        </div>
      )}
    </div>
  </div>
);

interface MigrationCompleteProps {
  result: MigrationResult;
  onDownloadReport: () => void;
  onClose: () => void;
  tr: (zh: string, en: string) => string;
}

const MigrationComplete: React.FC<MigrationCompleteProps> = ({
  result,
  onDownloadReport,
  onClose,
  tr
}) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="text-green-500" size={32} />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {tr('迁移完成', 'Migration complete')}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        {tr('数据迁移已成功完成', 'Data migration completed successfully')}
      </p>
    </div>

    {/* Results */}
    <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-2xl p-6">
      <h4 className="font-medium text-green-800 dark:text-green-200 mb-4">
        {tr('迁移结果', 'Results')}
      </h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex justify-between">
          <span className="text-green-700 dark:text-green-300">{tr('处理链条：', 'Chains processed:')}</span>
          <span className="font-medium text-green-800 dark:text-green-200">
            {result.totalChains}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-700 dark:text-green-300">{tr('创建规则：', 'Rules created:')}</span>
          <span className="font-medium text-green-800 dark:text-green-200">
            {result.migratedRules}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-700 dark:text-green-300">{tr('跳过规则：', 'Rules skipped:')}</span>
          <span className="font-medium text-green-800 dark:text-green-200">
            {result.skippedRules}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-700 dark:text-green-300">{tr('错误数量：', 'Errors:')}</span>
          <span className="font-medium text-green-800 dark:text-green-200">
            {result.errors.length}
          </span>
        </div>
      </div>
    </div>

    {/* Error Details */}
    {result.errors.length > 0 && (
      <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl p-6">
        <h4 className="font-medium text-red-800 dark:text-red-200 mb-3">
          {tr('迁移错误', 'Migration errors')}
        </h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {result.errors.map((error, index) => (
            <div key={index} className="text-sm text-red-700 dark:text-red-300">
              <span className="font-medium">{error.chainName}:</span> {error.error}
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Action Buttons */}
    <div className="flex items-center justify-end space-x-3">
      <button
        type="button"
        onClick={onDownloadReport}
        aria-label={tr('下载报告', 'Download report')}
        className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors flex items-center space-x-2"
      >
        <Download size={16} />
        <span>{tr('下载报告', 'Download report')}</span>
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label={tr('完成', 'Done')}
        className="px-6 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white transition-colors"
      >
        {tr('完成', 'Done')}
      </button>
    </div>
  </div>
);

export const MigrationDialogView = memo(MigrationDialogViewComponent);
