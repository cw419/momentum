import type { AppState } from '../../types';
import { logger } from '../../utils/logger';
import { toError } from '../../utils/errorHandling';
import { rsipTaskIntegrationService } from '../../services/rsip-integration/RSIPTaskIntegrationService';
import { ensureDate } from './rsip/helpers';
import { createGroupOperations } from './rsip/groupOperations';
import {
  buildLibraryArchive,
  createLibraryOperations,
} from './rsip/libraryOperations';
import { createNodeOperations } from './rsip/nodeOperations';
import { createRunOperations } from './rsip/runOperations';
import { createTaskLinkOperations } from './rsip/taskLinkOperations';
import type { SaveFns, UseRsipDomainParams } from './rsip/types';

const sliceWriteQueuesBySetter = new WeakMap<
  UseRsipDomainParams['setState'],
  Map<keyof AppState, Promise<void>>
>();

function logPersistenceError(
  message: string,
  context: Record<string, unknown>,
  error: unknown,
) {
  logger.error('RSIP', message, context, toError(error));
}

function expandNodeIdsFromLatestTree(
  nodes: AppState['rsipNodes'],
  initialIds: Set<string>,
): Set<string> {
  const expandedIds = new Set(initialIds);
  let addedDescendant = true;
  while (addedDescendant) {
    addedDescendant = false;
    for (const node of nodes) {
      if (
        node.parentId &&
        expandedIds.has(node.parentId) &&
        !expandedIds.has(node.id)
      ) {
        expandedIds.add(node.id);
        addedDescendant = true;
      }
    }
  }
  return expandedIds;
}

function latestOptionalDate(
  left: Date | undefined,
  right: Date | undefined,
): Date | undefined {
  if (!left) return right;
  if (!right) return left;
  return left.getTime() >= right.getTime() ? left : right;
}

function mergeQueuedMeta(current: AppState['rsipMeta'], requested: AppState['rsipMeta']) {
  const currentRunNumber = current.currentRunNumber ?? 0;
  const requestedRunNumber = requested.currentRunNumber ?? 0;
  const keepCurrentRun = currentRunNumber > requestedRunNumber;
  const currentTreeOpenedAt = current.lastTreeOpenedAt;
  const requestedTreeOpenedAt = requested.lastTreeOpenedAt;
  const keepCurrentTreeOpen =
    !!currentTreeOpenedAt &&
    (!requestedTreeOpenedAt ||
      currentTreeOpenedAt.getTime() > requestedTreeOpenedAt.getTime());

  return {
    ...current,
    ...requested,
    lastAddedAt: latestOptionalDate(
      current.lastAddedAt,
      requested.lastAddedAt,
    ),
    currentRunNumber: keepCurrentRun
      ? current.currentRunNumber
      : (requested.currentRunNumber ?? current.currentRunNumber),
    currentRunStartedAt: keepCurrentRun
      ? current.currentRunStartedAt
      : latestOptionalDate(
          current.currentRunStartedAt,
          requested.currentRunStartedAt,
        ),
    lastTreeOpenedAt: keepCurrentTreeOpen
      ? currentTreeOpenedAt
      : (requestedTreeOpenedAt ?? currentTreeOpenedAt),
    treeOpenStreak: keepCurrentTreeOpen
      ? current.treeOpenStreak
      : (requested.treeOpenStreak ?? current.treeOpenStreak),
  };
}

function mergeAuthoritativeLibrary(
  current: AppState['rsipPolicyLibrary'],
  removedIds: Set<string>,
  authoritativeEntries: AppState['rsipPolicyLibrary'],
) {
  const authoritativeById = new Map(
    authoritativeEntries.map((entry) => [entry.id, entry]),
  );
  const merged = current
    .filter(
      (entry) => !removedIds.has(entry.id) || authoritativeById.has(entry.id),
    )
    .map((entry) => authoritativeById.get(entry.id) ?? entry);
  const existingIds = new Set(merged.map((entry) => entry.id));
  return [
    ...merged,
    ...authoritativeEntries.filter((entry) => !existingIds.has(entry.id)),
  ];
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

export function useRsipDomain({
  setState,
  storage,
  getState,
  onNavigateToRSIP,
}: UseRsipDomainParams) {
  const readState = (): AppState | null => getState?.() ?? null;
  let sliceWriteQueues = sliceWriteQueuesBySetter.get(setState);
  if (!sliceWriteQueues) {
    sliceWriteQueues = new Map();
    sliceWriteQueuesBySetter.set(setState, sliceWriteQueues);
  }

  const persistThenCommitSlices = async (
    keys: (keyof AppState)[],
    persist: () => Promise<void>,
    commit: (current: AppState) => AppState,
  ) => {
    const previousWrites = [
      ...new Set(
        keys
          .map((key) => sliceWriteQueues.get(key))
          .filter((write): write is Promise<void> => write !== undefined),
      ),
    ];
    const currentWrite = Promise.all(
      previousWrites.map((write) => write.catch(() => undefined)),
    ).then(async () => {
      await persist();
      setState(commit);
    });
    for (const key of keys) {
      sliceWriteQueues.set(key, currentWrite);
    }

    try {
      await currentWrite;
    } finally {
      for (const key of keys) {
        if (sliceWriteQueues.get(key) === currentWrite) {
          sliceWriteQueues.delete(key);
        }
      }
    }
  };

  const persistThenCommitSlice = async <K extends keyof AppState>(
    key: K,
    value: AppState[K],
    persist: () => Promise<void>,
  ) => {
    const previousWrite = sliceWriteQueues.get(key) ?? Promise.resolve();
    const currentWrite = previousWrite
      .catch(() => undefined)
      .then(async () => {
        await persist();
        setState((current) => ({ ...current, [key]: value }));
      });
    sliceWriteQueues.set(key, currentWrite);

    try {
      await currentWrite;
    } finally {
      if (sliceWriteQueues.get(key) === currentWrite) {
        sliceWriteQueues.delete(key);
      }
    }
  };

  const persistThenAppendExecutionRecord = async (
    record: Parameters<SaveFns['appendExecutionRecord']>[0],
  ) => {
    const key = 'rsipExecutionRecords';
    const previousWrite = sliceWriteQueues.get(key) ?? Promise.resolve();
    const currentWrite = previousWrite
      .catch(() => undefined)
      .then(async () => {
        await storage.appendRSIPExecutionRecord(record);
        setState((current) => {
          return {
            ...current,
            rsipExecutionRecords: [...current.rsipExecutionRecords, record],
          };
        });
      });
    sliceWriteQueues.set(key, currentWrite);

    try {
      await currentWrite;
    } finally {
      if (sliceWriteQueues.get(key) === currentWrite) {
        sliceWriteQueues.delete(key);
      }
    }
  };

  const openRSIP = () => {
    onNavigateToRSIP?.();
  };

  const appendExecutionRecord: SaveFns['appendExecutionRecord'] = async (
    record,
  ) => {
    try {
      await persistThenAppendExecutionRecord(record);
    } catch (error) {
      logPersistenceError(
        'Failed to append RSIP execution record',
        { nodeId: record.nodeId, status: record.status },
        error,
      );
      throw error;
    }
  };

  const saveMeta: SaveFns['saveMeta'] = async (meta) => {
    let committedMeta = meta;
    try {
      await persistThenCommitSlices(
        ['rsipMeta'],
        async () => {
          committedMeta = mergeQueuedMeta(readState()?.rsipMeta ?? {}, meta);
          await storage.saveRSIPMeta(committedMeta);
        },
        (current) => ({ ...current, rsipMeta: committedMeta }),
      );
    } catch (error) {
      logPersistenceError('Failed to save RSIP meta', { meta }, error);
      throw error;
    }
  };

  const createNodes = async (
    nodes: Parameters<typeof storage.createRSIPNodesWithMeta>[0],
    addedAt: Date,
  ): Promise<void> => {
    let committedMeta = readState()?.rsipMeta ?? {};
    let authoritativeNodes = nodes;
    try {
      await persistThenCommitSlices(
        ['rsipNodes', 'rsipMeta'],
        async () => {
          const current = readState();
          const isFirstCreation =
            (current?.rsipNodes.length ?? 0) === 0 && nodes.length > 0;
          committedMeta = {
            ...(current?.rsipMeta ?? {}),
            lastAddedAt: addedAt,
            ...(isFirstCreation
              ? {
                  currentRunNumber: current?.rsipMeta.currentRunNumber ?? 1,
                  currentRunStartedAt:
                    current?.rsipMeta.currentRunStartedAt ?? addedAt,
                }
              : {}),
          };
          const result = await storage.createRSIPNodesWithMeta(
            nodes,
            committedMeta,
          );
          if (result) {
            authoritativeNodes = result.nodes;
            committedMeta = result.meta;
          }
        },
        (current) => {
          const requestedIds = new Set(nodes.map((node) => node.id));
          const authoritativeIds = new Set(
            authoritativeNodes.map((node) => node.id),
          );
          const nodesById = new Map(
            current.rsipNodes
              .filter(
                (node) =>
                  !requestedIds.has(node.id) || authoritativeIds.has(node.id),
              )
              .map((node) => [node.id, node]),
          );
          for (const node of authoritativeNodes) {
            if (!nodesById.has(node.id)) {
              nodesById.set(node.id, node);
            }
          }
          return {
            ...current,
            rsipNodes: [...nodesById.values()].sort(
              (left, right) => left.sortOrder - right.sortOrder,
            ),
            rsipMeta: committedMeta,
          };
        },
      );
    } catch (error) {
      logPersistenceError(
        'Failed to create RSIP nodes with meta',
        { nodeIds: nodes.map((node) => node.id), addedAt },
        error,
      );
      throw error;
    }
  };

  const saveGroups: SaveFns['saveGroups'] = async (groups) => {
    try {
      await persistThenCommitSlice('rsipGroups', groups, () =>
        storage.saveRSIPGroups(groups),
      );
    } catch (error) {
      logPersistenceError(
        'Failed to save RSIP groups',
        { count: groups.length },
        error,
      );
      throw error;
    }
  };

  const savePolicyLibrary: SaveFns['savePolicyLibrary'] = async (entries) => {
    try {
      await persistThenCommitSlice('rsipPolicyLibrary', entries, () =>
        storage.saveRSIPPolicyLibrary(entries),
      );
    } catch (error) {
      logPersistenceError(
        'Failed to save RSIP policy library',
        { count: entries.length },
        error,
      );
      throw error;
    }
  };

  const saveRunHistory: SaveFns['saveRunHistory'] = async (records) => {
    try {
      await persistThenCommitSlice('rsipRunHistory', records, () =>
        storage.saveRSIPRunHistory(records),
      );
    } catch (error) {
      logPersistenceError(
        'Failed to save RSIP run history',
        { count: records.length },
        error,
      );
      throw error;
    }
  };

  const saveTaskLinks: SaveFns['saveTaskLinks'] = async (links) => {
    const normalized = rsipTaskIntegrationService.resolveLatestLinks(
      links.map((link) => ({
        ...link,
        updatedAt: ensureDate(link.updatedAt, new Date()),
      })),
    );

    try {
      await persistThenCommitSlice('rsipTaskLinks', normalized, () =>
        storage.saveRSIPTaskLinks(normalized),
      );
    } catch (error) {
      logPersistenceError(
        'Failed to save RSIP task links',
        { count: normalized.length },
        error,
      );
      throw error;
    }
  };

  const appendRunRecord: SaveFns['appendRunRecord'] = async (
    record,
    nextHistory,
  ) => {
    try {
      await persistThenCommitSlice('rsipRunHistory', nextHistory, () =>
        storage.appendRSIPRunRecord(record),
      );
    } catch (error) {
      logPersistenceError(
        'Failed to append RSIP run history',
        { runNumber: record.runNumber },
        error,
      );
      throw error;
    }
  };

  const upsertLibraryEntry: SaveFns['upsertLibraryEntry'] = async (
    entry,
    nextEntries,
  ) => {
    try {
      await persistThenCommitSlice('rsipPolicyLibrary', nextEntries, () =>
        storage.upsertRSIPLibraryEntry(entry),
      );
    } catch (error) {
      logPersistenceError(
        'Failed to upsert RSIP library entry',
        { entryId: entry.id },
        error,
      );
      throw error;
    }
  };

  const upsertNode: SaveFns['upsertNode'] = async (node, nextNodes) => {
    try {
      await persistThenCommitSlice('rsipNodes', nextNodes, () =>
        storage.upsertRSIPNode(node),
      );
    } catch (error) {
      logPersistenceError(
        'Failed to upsert RSIP node',
        { nodeId: node.id },
        error,
      );
      throw error;
    }
  };

  const removeNodes: SaveFns['removeNodes'] = async (nodeIds, nextNodes) => {
    try {
      await persistThenCommitSlice('rsipNodes', nextNodes, () =>
        storage.removeRSIPNodes(nodeIds),
      );
    } catch (error) {
      logPersistenceError('Failed to remove RSIP nodes', { nodeIds }, error);
      throw error;
    }
  };

  const archiveAndRemoveNodes: SaveFns['archiveAndRemoveNodes'] = async (
    removedNodes,
  ) => {
    const removedIds = new Set(removedNodes.map((node) => node.id));
    let committedRemovedIds = removedIds;
    let persistedNodeIds = [...removedIds];
    let nextLibrary = readState()?.rsipPolicyLibrary ?? [];
    try {
      await persistThenCommitSlices(
        ['rsipNodes', 'rsipPolicyLibrary'],
        async () => {
          const current = readState();
          committedRemovedIds = current
            ? expandNodeIdsFromLatestTree(current.rsipNodes, removedIds)
            : removedIds;
          const liveRemovedNodes = current
            ? current.rsipNodes.filter((node) =>
                committedRemovedIds.has(node.id),
              )
            : removedNodes;
          persistedNodeIds = liveRemovedNodes.map((node) => node.id);
          nextLibrary = liveRemovedNodes.reduce(
            (library, node) => buildLibraryArchive(node, library).nextLibrary,
            current?.rsipPolicyLibrary ?? [],
          );
          const result = await storage.archiveRSIPNodesAndRemove(
            persistedNodeIds,
            nextLibrary,
          );
          if (result) {
            committedRemovedIds = new Set(result.removedNodeIds);
            nextLibrary = mergeAuthoritativeLibrary(
              current?.rsipPolicyLibrary ?? [],
              committedRemovedIds,
              result.libraryEntries,
            );
          }
        },
        (current) => ({
          ...current,
          rsipNodes: current.rsipNodes.filter(
            (node) => !committedRemovedIds.has(node.id),
          ),
          rsipPolicyLibrary: nextLibrary,
        }),
      );
    } catch (error) {
      logPersistenceError(
        'Failed to archive and remove violated RSIP nodes',
        { nodeIds: [...removedIds] },
        error,
      );
      throw error;
    }
  };

  const saveNodes: SaveFns['saveNodes'] = async (nodes) => {
    const writeContext: { previousState: AppState | null } = {
      previousState: null,
    };

    try {
      await persistThenCommitSlice('rsipNodes', nodes, () => {
        writeContext.previousState = readState();
        return storage.saveRSIPNodes(nodes);
      });
    } catch (error) {
      logPersistenceError(
        'Failed to save RSIP nodes',
        { nodeCount: nodes.length },
        error,
      );
      throw error;
    }

    const previousCount = writeContext.previousState?.rsipNodes.length ?? 0;
    const meta = writeContext.previousState?.rsipMeta;
    if (previousCount === 0 && nodes.length > 0 && meta) {
      await ignoreLoggedPostCommitFailure(runOperations.startNewRun(meta));
    }
  };

  const saveFns: SaveFns = {
    appendExecutionRecord,
    appendRunRecord,
    archiveAndRemoveNodes,
    removeNodes,
    saveGroups,
    saveMeta,
    saveNodes,
    savePolicyLibrary,
    saveRunHistory,
    saveTaskLinks,
    upsertLibraryEntry,
    upsertNode,
  };

  const runOperations = createRunOperations({
    readState,
    saveFns,
  });

  const groupOperations = createGroupOperations({
    readState,
    saveFns,
  });

  const libraryOperations = createLibraryOperations({
    readState,
    saveFns,
  });

  const nodeOperations = createNodeOperations({
    readState,
    saveFns,
    recordCollapse: runOperations.recordCollapse,
  });

  const taskLinkOperations = createTaskLinkOperations({
    readState,
    saveFns,
    markExecuted: nodeOperations.markExecuted,
    markViolated: nodeOperations.markViolated,
  });

  return {
    openRSIP,
    createNodes,
    saveNodes,
    saveMeta,
    saveGroups,
    savePolicyLibrary,
    saveRunHistory,
    saveTaskLinks,
    upsertTaskLinks: taskLinkOperations.upsertTaskLinks,
    createGroup: groupOperations.createGroup,
    isGroupAlive: groupOperations.isGroupAlive,
    archiveToLibrary: libraryOperations.archiveToLibrary,
    restoreFromLibrary: libraryOperations.restoreFromLibrary,
    recordCollapse: runOperations.recordCollapse,
    startNewRun: runOperations.startNewRun,
    getMode: runOperations.getMode,
    isStrictMode: runOperations.isStrictMode,
    markExecuted: nodeOperations.markExecuted,
    markViolated: nodeOperations.markViolated,
    reinforceNode: nodeOperations.reinforceNode,
    recordTreeOpened: runOperations.recordTreeOpened,
    hasOpenedToday: runOperations.hasOpenedToday,
    calculateConstraintPower: nodeOperations.calculateConstraintPower,
    calculatePhaseDistribution: nodeOperations.calculatePhaseDistribution,
    handleTaskEventIntegration: taskLinkOperations.handleTaskEventIntegration,
    getRsipTaskActions: taskLinkOperations.getRsipTaskActions,
  };
}
