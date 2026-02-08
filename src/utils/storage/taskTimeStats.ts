import type { Chain, CompletionHistory, TaskTimeStats } from '../../types';
import { STORAGE_KEYS } from './keys';
import { getChains } from './chains';
import { getCompletionHistory, saveCompletionHistory } from './history';

export function getTaskTimeStats(): TaskTimeStats[] {
  const data = localStorage.getItem(STORAGE_KEYS.TASK_TIME_STATS);
  if (!data) return [];
  return JSON.parse(data);
}

export function saveTaskTimeStats(stats: TaskTimeStats[]): void {
  localStorage.setItem(STORAGE_KEYS.TASK_TIME_STATS, JSON.stringify(stats));
}

export function getLastCompletionTime(chainId: string): number | null {
  const stats = getTaskTimeStats();
  const chainStats = stats.find((s) => s.chainId === chainId);
  return chainStats?.lastCompletionTime || null;
}

export function updateTaskTimeStats(
  chainId: string,
  actualDuration: number,
): void {
  const stats = getTaskTimeStats();
  const existingIndex = stats.findIndex((s) => s.chainId === chainId);

  if (existingIndex >= 0) {
    // 更新现有统计
    const existing = stats[existingIndex];
    const newTotalTime = existing.totalTime + actualDuration;
    const newTotalCompletions = existing.totalCompletions + 1;

    stats[existingIndex] = {
      ...existing,
      lastCompletionTime: actualDuration,
      averageCompletionTime: Math.round(newTotalTime / newTotalCompletions),
      totalCompletions: newTotalCompletions,
      totalTime: newTotalTime,
    };
  } else {
    // 创建新统计
    stats.push({
      chainId,
      lastCompletionTime: actualDuration,
      averageCompletionTime: actualDuration,
      totalCompletions: 1,
      totalTime: actualDuration,
    });
  }

  saveTaskTimeStats(stats);
}

export function getTaskAverageTime(chainId: string): number | null {
  const stats = getTaskTimeStats();
  const chainStats = stats.find((s) => s.chainId === chainId);
  return chainStats?.averageCompletionTime || null;
}

// 向后兼容性：为现有历史记录添加用时数据
export function migrateCompletionHistoryForTiming(): void {
  const history = getCompletionHistory();
  const chains = getChains();
  let hasChanges = false;

  const updatedHistory = history.map((record) => {
    // 如果记录还没有用时相关字段，添加它们
    if (
      record.actualDuration === undefined ||
      record.isForwardTimed === undefined
    ) {
      const chain = chains.find((c: Chain) => c.id === record.chainId);
      hasChanges = true;

      return {
        ...record,
        actualDuration: record.duration, // 使用原计划时长作为实际用时
        isForwardTimed: chain?.isDurationless || false, // 根据链条设置判断是否为正向计时
      } satisfies CompletionHistory;
    }
    return record;
  });

  if (hasChanges) {
    saveCompletionHistory(updatedHistory);
  }
}
