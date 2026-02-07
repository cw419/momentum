import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaskTimeStats } from '../../../../types';

const localPreferencesMock = vi.hoisted(() => ({
  getTaskTimeStats: vi.fn<() => string | null>(),
  setTaskTimeStats: vi.fn<(value: string) => void>(),
}));

async function loadModule() {
  vi.resetModules();
  vi.doMock('../../../../utils/localPreferences', () => ({
    localPreferences: localPreferencesMock,
  }));

  return import('../taskTimeStats');
}

function statsItem(overrides: Partial<TaskTimeStats> = {}): TaskTimeStats {
  return {
    chainId: overrides.chainId ?? 'chain-1',
    lastCompletionTime: overrides.lastCompletionTime ?? 120,
    averageCompletionTime: overrides.averageCompletionTime ?? 120,
    totalCompletions: overrides.totalCompletions ?? 1,
    totalTime: overrides.totalTime ?? 120,
  };
}

describe('supabase/taskTimeStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localPreferencesMock.getTaskTimeStats.mockReturnValue(null);
  });

  it('reads from storage once within cache TTL', async () => {
    const values = [JSON.stringify([statsItem()])];
    localPreferencesMock.getTaskTimeStats.mockImplementation(() => values[0] ?? null);

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const { getTaskTimeStats } = await loadModule();

    const first = await getTaskTimeStats();
    nowSpy.mockReturnValue(1_004);
    const second = await getTaskTimeStats();

    expect(first).toEqual([statsItem()]);
    expect(second).toEqual([statsItem()]);
    expect(localPreferencesMock.getTaskTimeStats).toHaveBeenCalledTimes(1);

    nowSpy.mockRestore();
  });

  it('refreshes cache after TTL and handles parse errors safely', async () => {
    localPreferencesMock.getTaskTimeStats
      .mockReturnValueOnce(JSON.stringify([statsItem({ chainId: 'first' })]))
      .mockReturnValueOnce('not-json');

    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000);

    const { getTaskTimeStats } = await loadModule();
    const first = await getTaskTimeStats();

    nowSpy.mockReturnValue(7_000);
    const second = await getTaskTimeStats();

    expect(first[0]?.chainId).toBe('first');
    expect(second).toEqual([]);
    expect(localPreferencesMock.getTaskTimeStats).toHaveBeenCalledTimes(2);

    nowSpy.mockRestore();
  });

  it('saves stats, updates existing chains and inserts new chains', async () => {
    localPreferencesMock.getTaskTimeStats.mockReturnValue(JSON.stringify([statsItem()]));

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const { saveTaskTimeStats, updateTaskTimeStats, getLastCompletionTime, getTaskAverageTime } = await loadModule();

    await saveTaskTimeStats([statsItem({ chainId: 'save-1', totalCompletions: 3, totalTime: 360, averageCompletionTime: 120 })]);
    expect(localPreferencesMock.setTaskTimeStats).toHaveBeenCalledTimes(1);

    await updateTaskTimeStats('save-1', 180);
    const savedExisting = JSON.parse(localPreferencesMock.setTaskTimeStats.mock.calls.at(-1)?.[0] ?? '[]') as TaskTimeStats[];
    expect(savedExisting[0]).toMatchObject({
      chainId: 'save-1',
      lastCompletionTime: 180,
      totalCompletions: 4,
      totalTime: 540,
      averageCompletionTime: 135,
    });

    await updateTaskTimeStats('chain-1', 90);
    const savedNew = JSON.parse(localPreferencesMock.setTaskTimeStats.mock.calls.at(-1)?.[0] ?? '[]') as TaskTimeStats[];
    expect(savedNew.find((item) => item.chainId === 'chain-1')).toMatchObject({
      averageCompletionTime: 90,
      totalCompletions: 1,
    });

    expect(await getLastCompletionTime('save-1')).toBe(180);
    expect(await getTaskAverageTime('save-1')).toBe(135);
    expect(await getTaskAverageTime('missing')).toBeNull();

    nowSpy.mockRestore();
  });
});
