import type { MigrationResult } from './types';

export function generateMigrationReport(result: MigrationResult): string {
  return `
=== 数据迁移报告 ===
迁移时间: ${new Date().toLocaleString()}
迁移状态: ${result.success ? '✅ 成功' : '❌ 失败'}
总迁移记录数: ${result.migratedRecords}

详细信息:
- 完成历史记录迁移: ${result.details.completionHistoryMigrated} 条
- 任务用时统计创建: ${result.details.taskTimeStatsCreated} 条
- 链条数据更新: ${result.details.chainsUpdated} 条

${
  result.errors.length > 0
    ? `
错误信息:
${result.errors.map((error, index) => `${index + 1}. ${error}`).join('\n')}
`
    : '无错误'
}

迁移完成。
`;
}

