import type { RSIPMeta, RSIPMode, RSIPRunRecord } from '../../../types';
import { DAY_IN_MS } from './types';
import { ensureDate } from './helpers';
import type { ReadState, SaveFns } from './types';

interface CreateRunOperationsParams {
  readState: ReadState;
  saveFns: Pick<SaveFns, 'appendRunRecord' | 'saveMeta'>;
}

export function createRunOperations({
  readState,
  saveFns,
}: CreateRunOperationsParams) {
  const recordCollapse = async (
    meta: RSIPMeta,
    reason?: string,
    nodeTitle?: string,
    maxNodeCount = 0,
  ): Promise<RSIPMeta> => {
    const state = readState();
    const now = new Date();
    const runNumber = meta.currentRunNumber ?? 1;
    const startedAt = ensureDate(meta.currentRunStartedAt, now);
    const durationDays = Math.max(
      1,
      Math.ceil((now.getTime() - startedAt.getTime()) / DAY_IN_MS),
    );

    const record: RSIPRunRecord = {
      runNumber,
      startedAt,
      endedAt: now,
      maxNodeCount,
      durationDays,
      collapseReason: reason,
      collapseNodeTitle: nodeTitle,
    };

    const nextHistory = [record, ...(state?.rsipRunHistory ?? [])];
    const nextMeta: RSIPMeta = {
      ...meta,
      currentRunNumber: runNumber + 1,
      currentRunStartedAt: now,
    };

    await Promise.all([
      saveFns.appendRunRecord(record, nextHistory),
      saveFns.saveMeta(nextMeta),
    ]);
    return nextMeta;
  };

  const startNewRun = async (meta: RSIPMeta): Promise<RSIPMeta> => {
    if (meta.currentRunNumber && meta.currentRunStartedAt) {
      return meta;
    }

    const nextMeta: RSIPMeta = {
      ...meta,
      currentRunNumber: meta.currentRunNumber ?? 1,
      currentRunStartedAt: meta.currentRunStartedAt ?? new Date(),
    };
    await saveFns.saveMeta(nextMeta);
    return nextMeta;
  };

  const getMode = (meta: RSIPMeta): RSIPMode => {
    return meta.allowMultiplePerDay ? 'free' : 'strict';
  };

  const isStrictMode = (meta: RSIPMeta): boolean => {
    return !meta.allowMultiplePerDay;
  };

  const recordTreeOpened = async (meta: RSIPMeta): Promise<RSIPMeta> => {
    const now = new Date();
    const today = now.toDateString();
    const lastOpened = meta.lastTreeOpenedAt?.toDateString();

    let treeOpenStreak = meta.treeOpenStreak ?? 0;
    if (lastOpened !== today) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      treeOpenStreak =
        lastOpened === yesterday.toDateString() ? treeOpenStreak + 1 : 1;
    }

    const updatedMeta: RSIPMeta = {
      ...meta,
      lastTreeOpenedAt: now,
      treeOpenStreak,
    };

    await saveFns.saveMeta(updatedMeta);
    return updatedMeta;
  };

  const hasOpenedToday = (meta: RSIPMeta): boolean => {
    if (!meta.lastTreeOpenedAt) {
      return false;
    }

    return meta.lastTreeOpenedAt.toDateString() === new Date().toDateString();
  };

  return {
    recordCollapse,
    startNewRun,
    getMode,
    isStrictMode,
    recordTreeOpened,
    hasOpenedToday,
  };
}
