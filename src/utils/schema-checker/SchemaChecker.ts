import { supabase } from '../../lib/supabase';

import { logger } from '../logger';

import { EXPECTED_SCHEMA } from './expectedSchema';
import {
  buildRecommendations,
  buildSchemaDiff,
  getMigrationStatus,
} from './schemaDiff';
import type { ColumnInfo, SchemaStatus, TableInfo } from './types';

export class SchemaChecker {
  private schemaCache: Map<
    string,
    { result: TableInfo | null; timestamp: number }
  > = new Map();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache

  private isValidTableName(tableName: string): boolean {
    return /^\w+$/.test(tableName);
  }

  private buildColumnQuery(tableName: string): string {
    const escapedTableName = tableName.replace(/'/g, "''");
    return [
      'SELECT column_name, data_type, is_nullable, column_default',
      'FROM information_schema.columns',
      "WHERE table_schema = 'public'",
      `  AND table_name = '${escapedTableName}'`,
      'ORDER BY ordinal_position',
    ].join('\n');
  }

  private parseColumnInfoRows(data: unknown): ColumnInfo[] | null {
    if (!Array.isArray(data)) {
      return null;
    }

    const columns: ColumnInfo[] = [];

    for (const row of data) {
      if (typeof row !== 'object' || row === null) {
        continue;
      }

      const record = row as Record<string, unknown>;
      const columnName = record['column_name'];
      const dataType = record['data_type'];
      const isNullable = record['is_nullable'];
      const columnDefault = record['column_default'];

      if (typeof columnName !== 'string') continue;
      if (typeof dataType !== 'string') continue;
      if (typeof isNullable !== 'string') continue;
      if (columnDefault !== null && typeof columnDefault !== 'string') continue;

      columns.push({
        column_name: columnName,
        data_type: dataType,
        is_nullable: isNullable,
        column_default: columnDefault,
      });
    }

    if (data.length > 0 && columns.length === 0) {
      return null;
    }

    return columns;
  }

  /**
   * Clear schema cache
   */
  clearSchemaCache(): void {
    this.schemaCache.clear();
    logger.info('SCHEMA', '架构缓存已清除');
  }

  async getTableInfo(tableName: string): Promise<TableInfo | null> {
    // Check cache first
    const cached = this.schemaCache.get(tableName);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.CACHE_DURATION) {
      logger.debug('SCHEMA', `使用缓存的表信息: ${tableName}`);
      return cached.result;
    }
    try {
      const client = supabase;
      if (!client) {
        this.schemaCache.set(tableName, { result: null, timestamp: now });
        return null;
      }

      if (!this.isValidTableName(tableName)) {
        logger.warn('SCHEMA', `表名不合法，无法检查: ${tableName}`);
        this.schemaCache.set(tableName, { result: null, timestamp: now });
        return null;
      }

      const sql = this.buildColumnQuery(tableName);
      const { data, error } = await client.rpc('exec_sql', { sql });

      if (error) {
        logger.error('SCHEMA', `获取表 ${tableName} 信息失败`, {
          error: error.message,
        });
        // Cache null result to avoid repeated failed queries
        this.schemaCache.set(tableName, { result: null, timestamp: now });
        return null;
      }

      const columns = this.parseColumnInfoRows(data);
      if (!columns) {
        logger.error('SCHEMA', `解析表 ${tableName} 列信息失败`, {
          rawDataType: typeof data,
        });
        this.schemaCache.set(tableName, { result: null, timestamp: now });
        return null;
      }

      const result: TableInfo = {
        table_name: tableName,
        columns,
      };

      // Cache successful result
      this.schemaCache.set(tableName, { result, timestamp: now });

      return result;
    } catch (error) {
      logger.error('SCHEMA', `查询表 ${tableName} 时发生异常`, { error });
      // Cache null result to avoid repeated failed queries
      this.schemaCache.set(tableName, { result: null, timestamp: now });
      return null;
    }
  }

  async checkAllTables(): Promise<Record<string, TableInfo | null>> {
    const results: Record<string, TableInfo | null> = {};

    for (const tableName of Object.keys(EXPECTED_SCHEMA)) {
      results[tableName] = await this.getTableInfo(tableName);
    }

    return results;
  }

  async getSchemaStatus(): Promise<SchemaStatus> {
    logger.info('SCHEMA', '开始检查数据库架构状态');

    const tableInfos = await this.checkAllTables();
    const diff = buildSchemaDiff(tableInfos);
    const migrationStatus = getMigrationStatus(diff);
    const recommendations = buildRecommendations(diff);

    const status: SchemaStatus = {
      tablesExist: diff.missingTables.length === 0,
      missingTables: diff.missingTables,
      missingColumns: diff.missingColumns,
      extraColumns: diff.extraColumns,
      migrationStatus,
      recommendations,
    };

    logger.info('SCHEMA', '架构检查完成', {
      migrationStatus,
      missingTablesCount: diff.missingTables.length,
      missingColumnsCount: Object.keys(diff.missingColumns).length,
    });

    return status;
  }

  async generateMigrationReport(): Promise<string> {
    const status = await this.getSchemaStatus();

    let report = '# 数据库架构状态报告\n\n';
    report += `生成时间: ${new Date().toISOString()}\n`;
    report += `迁移状态: ${status.migrationStatus}\n\n`;

    if (status.missingTables.length > 0) {
      report += '## 缺失的表\n';
      status.missingTables.forEach((table) => {
        report += `- ${table}\n`;
      });
      report += '\n';
    }

    if (Object.keys(status.missingColumns).length > 0) {
      report += '## 缺失的列\n';
      Object.entries(status.missingColumns).forEach(([table, columns]) => {
        report += `### ${table}\n`;
        columns.forEach((column) => {
          report += `- ${column}\n`;
        });
        report += '\n';
      });
    }

    if (Object.keys(status.extraColumns).length > 0) {
      report += '## 额外的列\n';
      Object.entries(status.extraColumns).forEach(([table, columns]) => {
        report += `### ${table}\n`;
        columns.forEach((column) => {
          report += `- ${column}\n`;
        });
        report += '\n';
      });
    }

    if (status.recommendations.length > 0) {
      report += '## 建议的操作\n';
      status.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
      report += '\n';
    }

    return report;
  }
}
