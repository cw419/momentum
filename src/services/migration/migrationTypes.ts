/**
 * 例外规则迁移类型定义
 */

import type { ExceptionRule } from '../../types';

/** 迁移服务版本号 */
export const MIGRATION_VERSION = '1.0.0';

/** 迁移规则描述（中文） */
export const LEGACY_MIGRATED_DESCRIPTION_ZH = '从旧系统迁移的规则';

/** 迁移规则描述（英文） */
export const LEGACY_MIGRATED_DESCRIPTION_EN = 'Migrated from legacy system';

/**
 * 迁移结果
 */
export interface MigrationResult {
  totalChains: number;
  migratedRules: number;
  skippedRules: number;
  errors: Array<{ chainId: string; chainName: string; error: string }>;
  createdRules: ExceptionRule[];
  migrationTime: Date;
}

/**
 * 迁移进度
 */
export interface MigrationProgress {
  currentChain: number;
  totalChains: number;
  currentChainName: string;
  phase: 'analyzing' | 'migrating' | 'cleanup' | 'complete';
  message: string;
}

/**
 * 迁移信息（存储在 localStorage）
 */
export interface MigrationInfo {
  version: string;
  migratedAt: Date;
  totalRules: number;
  skippedRules: number;
  errors: number;
  createdRuleIds?: string[];
}

/**
 * 迁移建议
 */
export interface MigrationSuggestions {
  totalRules: number;
  uniqueRules: string[];
  duplicateRules: Array<{ rule: string; count: number; chains: string[] }>;
  recommendations: string[];
}

/**
 * 迁移验证结果
 */
export interface MigrationValidation {
  isValid: boolean;
  issues: string[];
  statistics: {
    totalRules: number;
    migratedRules: number;
    activeRules: number;
  };
}

/**
 * 回滚结果
 */
export interface RollbackResult {
  success: boolean;
  message: string;
  deletedRules: number;
}
