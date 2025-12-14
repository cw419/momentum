import type { TaskTimeStats } from '../../../types';

const STORAGE_KEY = 'momentum_task_time_stats';

export async function getTaskTimeStats(): Promise<TaskTimeStats[]> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveTaskTimeStats(stats: TaskTimeStats[]): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

export async function getLastCompletionTime(chainId: string): Promise<number | null> {
  const stats = await getTaskTimeStats();
  const chainStats = stats.find(s => s.chainId === chainId);
  return chainStats?.lastCompletionTime || null;
}

export async function updateTaskTimeStats(chainId: string, actualDuration: number): Promise<void> {
  const stats = await getTaskTimeStats();
  const existingIndex = stats.findIndex(s => s.chainId === chainId);

  if (existingIndex >= 0) {
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
    stats.push({
      chainId,
      lastCompletionTime: actualDuration,
      averageCompletionTime: actualDuration,
      totalCompletions: 1,
      totalTime: actualDuration,
    });
  }

  await saveTaskTimeStats(stats);
}

export async function getTaskAverageTime(chainId: string): Promise<number | null> {
  const stats = await getTaskTimeStats();
  const chainStats = stats.find(s => s.chainId === chainId);
  return chainStats?.averageCompletionTime || null;
}

