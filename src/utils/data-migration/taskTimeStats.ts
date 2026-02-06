import { storage } from '../storage';
import { TaskTimeStats } from '../../types';
import { getErrorMessage } from '../errorMessage';

export async function createTaskTimeStats(): Promise<{
  createdCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let createdCount = 0;

  try {
    const history = storage.getCompletionHistory();
    const existingStats = storage.getTaskTimeStats();
    const statsMap = new Map<string, TaskTimeStats>();

    existingStats.forEach((stat) => {
      statsMap.set(stat.chainId, stat);
    });

    history.forEach((record, index) => {
      try {
        if (!record.wasSuccessful || !record.actualDuration) {
          return;
        }

        const chainId = record.chainId;

        if (statsMap.has(chainId)) {
          return;
        }

        const chainRecords = history.filter(
          (h) => h.chainId === chainId && h.wasSuccessful && h.actualDuration !== undefined,
        );

        if (chainRecords.length === 0) return;

        const totalTime = chainRecords.reduce((sum, r) => sum + (r.actualDuration || 0), 0);
        const totalCompletions = chainRecords.length;
        const lastRecord = chainRecords.sort(
          (a, b) => b.completedAt.getTime() - a.completedAt.getTime(),
        )[0];

        const stats: TaskTimeStats = {
          chainId,
          lastCompletionTime: lastRecord.actualDuration || 0,
          averageCompletionTime: Math.round(totalTime / totalCompletions),
          totalCompletions,
          totalTime,
        };

        statsMap.set(chainId, stats);
        createdCount++;
      } catch (error) {
        errors.push(`处理历史记录 ${index} 时出错: ${getErrorMessage(error)}`);
      }
    });

    if (createdCount > 0) {
      storage.saveTaskTimeStats(Array.from(statsMap.values()));
    }
  } catch (error) {
    errors.push(`创建任务用时统计时出错: ${getErrorMessage(error)}`);
  }

  return { createdCount, errors };
}

