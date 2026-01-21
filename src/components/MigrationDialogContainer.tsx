/**
 * MigrationDialogContainer - Container 组件
 * 处理状态管理和业务逻辑，将展示委托给 MigrationDialogView
 */

import React from 'react';
import { MigrationDialogView } from './MigrationDialogView';
import { useMigrationDialog } from './useMigrationDialog';
import type { MigrationResult } from '../services/ExceptionRuleMigration';

export interface MigrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMigrationComplete?: (result: MigrationResult) => void;
}

export const MigrationDialogContainer: React.FC<MigrationDialogProps> = ({
  isOpen,
  onClose,
  onMigrationComplete
}) => {
  const {
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
    handleStartMigration,
    handleDownloadReport,
    handleToggleDetails,
    tr
  } = useMigrationDialog({ isOpen, onClose, onMigrationComplete });

  if (!isOpen) return null;

  return (
    <MigrationDialogView
      loading={loading}
      error={error}
      migrationNeeded={migrationNeeded}
      migrationSuggestions={migrationSuggestions}
      migrating={migrating}
      migrationProgress={migrationProgress}
      migrationResult={migrationResult}
      showDetails={showDetails}
      progressPercentage={progressPercentage}
      phaseDisplayName={phaseDisplayName}
      onClose={onClose}
      onStartMigration={handleStartMigration}
      onDownloadReport={handleDownloadReport}
      onToggleDetails={handleToggleDetails}
      tr={tr}
    />
  );
};

MigrationDialogContainer.displayName = 'MigrationDialogContainer';

// 为了向后兼容，导出为 MigrationDialog
export const MigrationDialog = MigrationDialogContainer;
