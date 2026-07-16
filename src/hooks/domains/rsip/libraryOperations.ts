import type { RSIPLibraryEntry, RSIPNode } from '../../../types';
import { computeInternalizationProgress } from './helpers';
import type { ReadState, SaveFns } from './types';

interface CreateLibraryOperationsParams {
  readState: ReadState;
  saveFns: Pick<SaveFns, 'saveNodes' | 'upsertLibraryEntry'>;
}

async function ignoreLoggedPostCommitFailure(
  operation: Promise<unknown>,
): Promise<void> {
  try {
    await operation;
  } catch {
    return;
  }
}

export function buildLibraryArchive(
  node: RSIPNode,
  library: RSIPLibraryEntry[],
  now = new Date(),
): { entry: RSIPLibraryEntry; nextLibrary: RSIPLibraryEntry[] } {
  const cumulativeExecutionDays = Math.max(
    0,
    node.cumulativeExecutionDays ?? 0,
    node.totalExecutions ?? 0,
  );
  const existingIndex = library.findIndex((entry) => entry.id === node.id);

  if (existingIndex >= 0) {
    const current = library[existingIndex];
    const nextCumulativeExecutionDays = Math.max(
      current.cumulativeExecutionDays,
      cumulativeExecutionDays,
    );
    const entry: RSIPLibraryEntry = {
      ...current,
      title: node.title,
      rule: node.rule,
      type: node.type ?? current.type,
      emoji: node.emoji ?? current.emoji,
      useTimer: node.useTimer ?? current.useTimer,
      timerMinutes: node.timerMinutes ?? current.timerMinutes,
      isPassive: node.isPassive ?? current.isPassive,
      cumulativeExecutionDays: nextCumulativeExecutionDays,
      internalizationProgress: Math.max(
        current.internalizationProgress,
        computeInternalizationProgress(nextCumulativeExecutionDays),
      ),
      lastActiveAt:
        current.lastActiveAt.getTime() >= now.getTime()
          ? current.lastActiveAt
          : now,
      timesUsed: current.timesUsed,
    };
    const nextLibrary = [...library];
    nextLibrary.splice(existingIndex, 1, entry);
    return { entry, nextLibrary };
  }

  const entry: RSIPLibraryEntry = {
    id: node.id,
    title: node.title,
    rule: node.rule,
    type: node.type,
    emoji: node.emoji,
    useTimer: node.useTimer,
    timerMinutes: node.timerMinutes,
    isPassive: node.isPassive,
    cumulativeExecutionDays,
    internalizationProgress: computeInternalizationProgress(
      cumulativeExecutionDays,
    ),
    lastActiveAt: now,
    timesUsed: 1,
  };
  return { entry, nextLibrary: [...library, entry] };
}

export function createLibraryOperations({
  readState,
  saveFns,
}: CreateLibraryOperationsParams) {
  const archiveToLibrary = async (
    node: RSIPNode,
    existingLibrary?: RSIPLibraryEntry[],
  ): Promise<RSIPLibraryEntry[]> => {
    const state = readState();
    const library = existingLibrary ?? state?.rsipPolicyLibrary ?? [];
    const { entry, nextLibrary } = buildLibraryArchive(node, library);
    await saveFns.upsertLibraryEntry(entry, nextLibrary);
    return nextLibrary;
  };

  const restoreFromLibrary = async (
    entryId: string,
    parentId?: string,
  ): Promise<RSIPNode | null> => {
    const state = readState();
    if (!state) {
      return null;
    }

    const entry = state.rsipPolicyLibrary.find((item) => item.id === entryId);
    if (!entry) {
      return null;
    }

    const now = new Date();
    const node: RSIPNode = {
      id: crypto.randomUUID(),
      parentId,
      title: entry.title,
      rule: entry.rule,
      sortOrder: Math.floor(now.getTime() / 1000),
      createdAt: now,
      useTimer: entry.useTimer,
      timerMinutes: entry.timerMinutes,
      type: entry.type,
      emoji: entry.emoji,
      isPassive: entry.isPassive,
      cumulativeExecutionDays: entry.cumulativeExecutionDays,
      stabilityPhase: 'E0',
      consecutiveExecutions: 0,
      consecutiveViolations: 0,
      totalExecutions: 0,
      totalViolations: 0,
    };

    await saveFns.saveNodes([...state.rsipNodes, node]);

    const updatedEntry: RSIPLibraryEntry = {
      ...entry,
      lastActiveAt: now,
      timesUsed: entry.timesUsed + 1,
    };
    const updatedLibrary = state.rsipPolicyLibrary.map((item) =>
      item.id === entryId ? updatedEntry : item,
    );
    await ignoreLoggedPostCommitFailure(
      saveFns.upsertLibraryEntry(updatedEntry, updatedLibrary),
    );

    return node;
  };

  return {
    archiveToLibrary,
    restoreFromLibrary,
  };
}
