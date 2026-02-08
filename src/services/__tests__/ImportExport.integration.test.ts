import type { Chain, CompletionHistory } from '../../types';
import { importExportService } from '../ImportExportService';

describe('ImportExportService integration', () => {
  const tr = (zh: string, _en: string) => zh;

  test('roundtrips chains + history with id remapping', () => {
    const parentChain: Chain = {
      id: 'chain-parent',
      type: 'unit',
      sortOrder: 1,
      name: 'Parent chain',
      trigger: 'Parent trigger',
      duration: 45,
      description: 'Parent description',
      currentStreak: 2,
      auxiliaryStreak: 1,
      totalCompletions: 10,
      totalFailures: 3,
      auxiliaryFailures: 1,
      exceptions: ['ex-1'],
      auxiliaryExceptions: ['aux-ex-1'],
      auxiliarySignal: 'signal',
      auxiliaryDuration: 15,
      auxiliaryCompletionTrigger: 'completion trigger',
      timeLimitExceptions: [],
      isDurationless: false,
      minimumDuration: undefined,
      taskRepeatCount: undefined,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      lastCompletedAt: new Date('2026-01-02T00:00:00.000Z'),
      deletedAt: null,
    };

    const childChain: Chain = {
      ...parentChain,
      id: 'chain-child',
      parentId: parentChain.id,
      sortOrder: 2,
      name: 'Child chain',
      currentStreak: 5,
      totalCompletions: 20,
      createdAt: new Date('2026-01-05T00:00:00.000Z'),
      lastCompletedAt: undefined,
    };

    const historyEntry: CompletionHistory = {
      chainId: childChain.id,
      completedAt: new Date('2026-01-06T00:00:00.000Z'),
      duration: 30,
      wasSuccessful: true,
      isForwardTimed: false,
      description: 'did work',
      notes: 'notes',
    };

    const exportData = importExportService.createExportData({
      chains: [parentChain, childChain],
      history: [historyEntry],
      exceptionRules: {
        rules: [
          { name: 'Take a break', type: 'pause_only', description: 'ok' },
          { name: 123, type: 'pause_only' },
        ],
      },
    });

    const imported = importExportService.parseImportData({
      json: JSON.stringify(exportData),
      options: {
        preserveStatistics: true,
        preserveTimestamps: true,
        importCompletionHistory: true,
      },
      tr,
    });

    expect(imported.chains).toHaveLength(2);
    expect(imported.history).toHaveLength(1);
    expect(imported.exceptionRulesToImport).toHaveLength(1);

    const importedParent = imported.chains.find(
      (c) => c.name === 'Parent chain',
    );
    const importedChild = imported.chains.find((c) => c.name === 'Child chain');
    expect(importedParent).toBeDefined();
    expect(importedChild).toBeDefined();

    expect(importedChild!.parentId).toBe(importedParent!.id);
    expect(importedChild!.currentStreak).toBe(5);
    expect(importedChild!.totalCompletions).toBe(20);
    expect(importedChild!.createdAt.toISOString()).toBe(
      childChain.createdAt.toISOString(),
    );

    expect(imported.history[0]!.chainId).toBe(importedChild!.id);
    expect(imported.history[0]!.completedAt.toISOString()).toBe(
      historyEntry.completedAt.toISOString(),
    );
    expect(imported.history[0]!.duration).toBe(30);
    expect(imported.history[0]!.wasSuccessful).toBe(true);
  });
});
