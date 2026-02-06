import { supabase } from '../../lib/supabase';

import { logger } from '../logger';
import { schemaChecker } from '../schemaChecker';

import { KNOWN_MIGRATIONS } from './knownMigrations';
import { getBasicTableSQL, getDurationlessSQL, getHierarchySQL, getRSIPSQL, getTimeLimitSQL } from './sqlTemplates';

export class MigrationHelper {
  /**
   * Check if a specific migration has been applied by checking for expected columns/tables
   */
  async isMigrationApplied(migrationId: string): Promise<boolean> {
    try {
      if (!supabase) {
        return false;
      }

      switch (migrationId) {
        case '20250730021823_winter_flame': {
          // Check if basic tables exist
          const chainsTable = await schemaChecker.getTableInfo('chains');
          return !!chainsTable && chainsTable.columns.length > 0;
        }

        case '20250801160754_peaceful_palace':
        case '20250801161456_fading_sunset': {
          // Check if parent_id and type columns exist
          const chainsTable = await schemaChecker.getTableInfo('chains');
          if (!chainsTable || chainsTable.columns.length === 0) {
            return false;
          }

          const columnNames = new Set(chainsTable.columns.map((col) => col.column_name));
          return columnNames.has('parent_id') && columnNames.has('type');
        }

        case '20250808000000_add_group_time_limit': {
          // Check if time limit columns exist
          const chainsTable = await schemaChecker.getTableInfo('chains');
          if (!chainsTable || chainsTable.columns.length === 0) {
            return false;
          }

          const columnNames = new Set(chainsTable.columns.map((col) => col.column_name));
          return (
            columnNames.has('time_limit_hours') &&
            columnNames.has('group_started_at') &&
            columnNames.has('group_expires_at')
          );
        }

        case '20250808001000_add_durationless_flag': {
          // Check if is_durationless column exists
          const chainsTable = await schemaChecker.getTableInfo('chains');
          if (!chainsTable || chainsTable.columns.length === 0) {
            return false;
          }

          const columnNames = new Set(chainsTable.columns.map((col) => col.column_name));
          return columnNames.has('is_durationless');
        }

        case '20250810000000_add_rsip_tables': {
          // Check if RSIP tables exist
          const rsipNodesTable = await schemaChecker.getTableInfo('rsip_nodes');
          const rsipMetaTable = await schemaChecker.getTableInfo('rsip_meta');

          return (
            !!rsipNodesTable &&
            rsipNodesTable.columns.length > 0 &&
            !!rsipMetaTable &&
            rsipMetaTable.columns.length > 0
          );
        }

        default:
          return false;
      }
    } catch (error) {
      logger.error('MIGRATION', `检查迁移 ${migrationId} 状态失败`, { error });
      return false;
    }
  }

  /**
   * Get the status of all migrations
   */
  async getMigrationStatus(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};

    for (const migration of KNOWN_MIGRATIONS) {
      status[migration] = await this.isMigrationApplied(migration);
    }

    return status;
  }

  /**
   * Generate SQL commands to apply missing migrations
   */
  async generateMigrationSQL(): Promise<string> {
    const status = await this.getMigrationStatus();

    let sql = '-- 自动生成的迁移SQL\n';
    sql += `-- 生成时间: ${new Date().toISOString()}\n\n`;

    if (!status['20250730021823_winter_flame']) {
      sql += '-- 基础表结构迁移\n';
      sql += '-- 来源: 20250730021823_winter_flame.sql\n\n';
      sql += getBasicTableSQL() + '\n\n';
    }

    if (!status['20250801160754_peaceful_palace']) {
      sql += '-- 任务群功能支持迁移\n';
      sql += '-- 来源: 20250801160754_peaceful_palace.sql\n\n';
      sql += getHierarchySQL() + '\n\n';
    }

    if (!status['20250808000000_add_group_time_limit']) {
      sql += '-- 任务群时间限制功能迁移\n';
      sql += '-- 来源: 20250808000000_add_group_time_limit.sql\n\n';
      sql += getTimeLimitSQL() + '\n\n';
    }

    if (!status['20250808001000_add_durationless_flag']) {
      sql += '-- 无时长任务功能迁移\n';
      sql += '-- 来源: 20250808001000_add_durationless_flag.sql\n\n';
      sql += getDurationlessSQL() + '\n\n';
    }

    if (!status['20250810000000_add_rsip_tables']) {
      sql += '-- RSIP功能表迁移\n';
      sql += '-- 来源: 20250810000000_add_rsip_tables.sql\n\n';
      sql += getRSIPSQL() + '\n\n';
    }

    return sql;
  }

  /**
   * Generate a comprehensive migration report
   */
  async generateMigrationReport(): Promise<string> {
    const migrationStatus = await this.getMigrationStatus();
    const schemaStatus = await schemaChecker.getSchemaStatus();

    let report = '# 数据库迁移状态报告\n\n';
    report += `生成时间: ${new Date().toISOString()}\n`;
    report += `总体状态: ${schemaStatus.migrationStatus}\n\n`;

    report += '## 迁移文件状态\n\n';
    Object.entries(migrationStatus).forEach(([migration, applied]) => {
      const status = applied ? '✅ 已应用' : '❌ 未应用';
      report += `- ${migration}: ${status}\n`;
    });

    report += '\n## 建议的操作\n\n';
    if (schemaStatus.recommendations.length > 0) {
      schemaStatus.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
    } else {
      report += '所有迁移已正确应用，无需额外操作。\n';
    }

    const unappliedMigrations = Object.entries(migrationStatus)
      .filter(([, applied]) => !applied)
      .map(([migration]) => migration);

    if (unappliedMigrations.length > 0) {
      report += '\n## 如何应用缺失的迁移\n\n';
      report += '1. 在 Supabase Dashboard 中打开 SQL Editor\n';
      report += '2. 运行以下 SQL 命令来应用缺失的迁移:\n\n';
      report += '```sql\n';
      report += await this.generateMigrationSQL();
      report += '```\n\n';
      report += '3. 刷新应用程序以验证迁移是否成功\n';
    }

    return report;
  }
}

