/**
 * useMigrationDialog hook
 * 封装 MigrationDialog 的状态和业务逻辑
 */

import { useState, useEffect, useCallback } from 'react';
import {
  MigrationResult,
  MigrationProgress,
  exceptionRuleMigration
} from '../services/ExceptionRuleMigration';
import { useI18n } from '../i18n';
import { getSafeErrorDetailFromUnknown } from '../utils/errorMessage';
import type { MigrationSuggestions } from './MigrationDialogView';

interface UseMigrationDialogOptions {
  isOpen: boolean;
  onClose: () => void;
  onMigrationComplete?: (result: MigrationResult) => void;
}

export function useMigrationDialog({
  isOpen,
  onClose,
  onMigrationComplete
}: UseMigrationDialogOptions) {
  const { language, tr } = useI18n();

  // 状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationNeeded, setMigrationNeeded] = useState<boolean | null>(null);
  const [migrationSuggestions, setMigrationSuggestions] = useState<MigrationSuggestions | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // ESC 键关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !migrating) {
      onClose();
    }
  }, [onClose, migrating]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // 检查迁移需求
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const checkMigrationNeeded = async () => {
      try {
        setLoading(true);
        setError(null);

        const needed = await exceptionRuleMigration.needsMigration();
        if (cancelled) return;
        setMigrationNeeded(needed);

        if (needed) {
          const suggestions = await exceptionRuleMigration.getMigrationSuggestions();
          if (cancelled) return;
          setMigrationSuggestions(suggestions);
        }
      } catch (err) {
        if (cancelled) return;
        const safe = getSafeErrorDetailFromUnknown(err, language);
        setError(safe ?? tr('检查迁移需求失败', 'Failed to check migration status'));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void checkMigrationNeeded();

    return () => {
      cancelled = true;
    };
  }, [isOpen, language, tr]);

  // 开始迁移
  const handleStartMigration = useCallback(async () => {
    try {
      setMigrating(true);
      setError(null);
      setMigrationProgress(null);
      setMigrationResult(null);

      const result = await exceptionRuleMigration.migrate((progress) => {
        setMigrationProgress(progress);
      });

      setMigrationResult(result);
      onMigrationComplete?.(result);

    } catch (err) {
      const safe = getSafeErrorDetailFromUnknown(err, language);
      setError(safe ?? tr('迁移失败', 'Migration failed'));
    } finally {
      setMigrating(false);
    }
  }, [language, tr, onMigrationComplete]);

  // 下载报告
  const handleDownloadReport = useCallback(async () => {
    try {
      const report = await exceptionRuleMigration.generateMigrationReport();
      const blob = new Blob([report], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `migration-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError(tr('下载报告失败', 'Failed to download report'));
    }
  }, [tr]);

  // 切换详情显示
  const handleToggleDetails = useCallback(() => {
    setShowDetails(prev => !prev);
  }, []);

  // 计算进度百分比
  const getProgressPercentage = useCallback((): number => {
    if (!migrationProgress) return 0;
    if (migrationProgress.phase === 'complete') return 100;
    if (migrationProgress.totalChains === 0) return 0;
    return Math.round((migrationProgress.currentChain / migrationProgress.totalChains) * 100);
  }, [migrationProgress]);

  // 获取阶段显示名称
  const getPhaseDisplayName = useCallback((phase: MigrationProgress['phase']): string => {
    switch (phase) {
      case 'analyzing': return tr('分析数据', 'Analyzing');
      case 'migrating': return tr('迁移中', 'Migrating');
      case 'cleanup': return tr('清理', 'Cleanup');
      case 'complete': return tr('完成', 'Complete');
      default: return tr('处理中', 'Processing');
    }
  }, [tr]);

  return {
    // 状态
    loading,
    error,
    migrationNeeded,
    migrationSuggestions,
    migrating,
    migrationProgress,
    migrationResult,
    showDetails,

    // 计算值
    progressPercentage: getProgressPercentage(),
    phaseDisplayName: migrationProgress ? getPhaseDisplayName(migrationProgress.phase) : '',

    // 事件处理器
    handleStartMigration,
    handleDownloadReport,
    handleToggleDetails,

    // 国际化
    tr
  };
}
