/**
 * 例外规则数据迁移服务
 * 处理从旧的 Chain.exceptions 格式迁移到新的例外规则系统
 *
 * 模块结构:
 * - migrationTypes.ts: 类型定义和常量
 * - MigrationStorage.ts: 存储操作
 * - MigrationAnalyzer.ts: 分析和报告功能
 * - MigrationExecutor.ts: 迁移和回滚执行
 */

import type { MomentumStorage } from '../storage/MomentumStorage';
import {
  migrationStorage,
  MigrationAnalyzer,
  MigrationExecutor,
  type MigrationResult,
  type MigrationProgress,
  type MigrationSuggestions,
  type MigrationValidation,
  type RollbackResult
} from './migration';

export type { MigrationResult, MigrationProgress };

/**
 * 例外规则迁移服务
 * 组合存储、分析器和执行器，提供完整的迁移功能
 */
export class ExceptionRuleMigrationService {
  private analyzer: MigrationAnalyzer;
  private executor: MigrationExecutor;

  constructor() {
    this.analyzer = new MigrationAnalyzer(migrationStorage);
    this.executor = new MigrationExecutor(migrationStorage);
  }

  /**
   * 设置存储实例
   */
  setStorage(storage: MomentumStorage | null): void {
    migrationStorage.setStorage(storage);
  }

  /**
   * 检查是否需要迁移
   */
  async needsMigration(): Promise<boolean> {
    return this.executor.needsMigration();
  }

  /**
   * 执行迁移
   */
  async migrate(
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    return this.executor.migrate(onProgress);
  }

  /**
   * 获取迁移建议
   */
  async getMigrationSuggestions(): Promise<MigrationSuggestions> {
    return this.analyzer.getMigrationSuggestions();
  }

  /**
   * 回滚迁移
   */
  async rollback(): Promise<RollbackResult> {
    return this.executor.rollback();
  }

  /**
   * 验证迁移结果
   */
  async validateMigration(): Promise<MigrationValidation> {
    return this.analyzer.validateMigration();
  }

  /**
   * 创建迁移报告
   */
  async generateMigrationReport(): Promise<string> {
    return this.analyzer.generateMigrationReport();
  }
}

export const exceptionRuleMigration = new ExceptionRuleMigrationService();
