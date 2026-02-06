import { logger } from '../logger';

import { EXPECTED_SCHEMA } from './expectedSchema';
import type { MigrationStatus, SchemaDiff, TableInfo } from './types';

export function buildSchemaDiff(tableInfos: Record<string, TableInfo | null>): SchemaDiff {
  const missingTables: string[] = [];
  const missingColumns: Record<string, string[]> = {};
  const extraColumns: Record<string, string[]> = {};

  for (const [tableName, expectedColumns] of Object.entries(EXPECTED_SCHEMA)) {
    const tableInfo = tableInfos[tableName];
    if (!tableInfo || tableInfo.columns.length === 0) {
      missingTables.push(tableName);
      logger.warn('SCHEMA', `表 ${tableName} 不存在或无法访问`);
      continue;
    }

    const actualColumns = tableInfo.columns.map((col) => col.column_name);
    const missing = expectedColumns.filter((col) => !actualColumns.includes(col));
    const extra = actualColumns.filter((col) => !expectedColumns.includes(col));

    if (missing.length > 0) {
      missingColumns[tableName] = missing;
      logger.warn('SCHEMA', `表 ${tableName} 缺少列`, { missingColumns: missing });
    }

    if (extra.length > 0) {
      extraColumns[tableName] = extra;
      logger.info('SCHEMA', `表 ${tableName} 有额外列`, { extraColumns: extra });
    }
  }

  return { missingTables, missingColumns, extraColumns };
}

export function getMigrationStatus(diff: SchemaDiff): MigrationStatus {
  if (diff.missingTables.length > 0) return 'missing';
  if (Object.keys(diff.missingColumns).length > 0) return 'partial';
  return 'complete';
}

export function buildRecommendations(diff: SchemaDiff): string[] {
  const recommendations: string[] = [];

  if (diff.missingTables.length > 0) {
    recommendations.push(`需要创建以下表: ${diff.missingTables.join(', ')}`);
    recommendations.push('运行基础迁移脚本 20250730021823_winter_flame.sql');
  }

  const missingChainColumns = diff.missingColumns['chains'] ?? [];
  const chainMigrationHints: Array<{ columns: string[]; recommendation: string }> = [
    { columns: ['parent_id', 'type'], recommendation: '运行任务群支持迁移: 20250801160754_peaceful_palace.sql' },
    {
      columns: ['time_limit_hours', 'group_expires_at'],
      recommendation: '运行时间限制迁移: 20250808000000_add_group_time_limit.sql',
    },
    { columns: ['is_durationless'], recommendation: '运行无时长任务迁移: 20250808001000_add_durationless_flag.sql' },
    { columns: ['deleted_at'], recommendation: '运行软删除功能迁移: 20250814000000_add_soft_delete.sql' },
  ];

  for (const hint of chainMigrationHints) {
    if (hint.columns.some((col) => missingChainColumns.includes(col))) {
      recommendations.push(hint.recommendation);
    }
  }

  if (diff.missingTables.includes('rsip_nodes') || diff.missingTables.includes('rsip_meta')) {
    recommendations.push('运行RSIP功能迁移: 20250810000000_add_rsip_tables.sql');
  }

  if (Object.keys(diff.missingColumns).length === 0 && diff.missingTables.length === 0) {
    recommendations.push('数据库架构完整，建议运行性能优化索引脚本以提升查询性能');
  }

  return recommendations;
}

