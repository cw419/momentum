import type { AppState } from '../../types';
import { logger } from '../../utils/logger';
import { toError } from '../../utils/errorHandling';
import { rsipTaskIntegrationService } from '../../services/rsip-integration/RSIPTaskIntegrationService';
import { ensureDate } from './rsip/helpers';
import { createGroupOperations } from './rsip/groupOperations';
import { createLibraryOperations } from './rsip/libraryOperations';
import { createNodeOperations } from './rsip/nodeOperations';
import { createRunOperations } from './rsip/runOperations';
import { createTaskLinkOperations } from './rsip/taskLinkOperations';
import type { SaveFns, UseRsipDomainParams } from './rsip/types';

function logPersistenceError(
  message: string,
  context: Record<string, unknown>,
  error: unknown,
) {
  logger.error('RSIP', message, context, toError(error));
}

export function useRsipDomain({
  setState,
  storage,
  getState,
  onNavigateToRSIP,
}: UseRsipDomainParams) {
  const readState = (): AppState | null => getState?.() ?? null;

  const setSlice = <K extends keyof AppState>(key: K, value: AppState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const openRSIP = () => {
    onNavigateToRSIP?.();
  };

  const appendExecutionRecord: SaveFns['appendExecutionRecord'] = async (
    record,
  ) => {
    setState((prev) => ({
      ...prev,
      rsipExecutionRecords: [...prev.rsipExecutionRecords, record],
    }));

    try {
      await storage.appendRSIPExecutionRecord(record);
    } catch (error) {
      logPersistenceError(
        'Failed to append RSIP execution record',
        { nodeId: record.nodeId, status: record.status },
        error,
      );
    }
  };

  const saveMeta: SaveFns['saveMeta'] = async (meta) => {
    setSlice('rsipMeta', meta);
    try {
      await storage.saveRSIPMeta(meta);
    } catch (error) {
      logPersistenceError('Failed to save RSIP meta', { meta }, error);
    }
  };

  const saveGroups: SaveFns['saveGroups'] = async (groups) => {
    setSlice('rsipGroups', groups);
    try {
      await storage.saveRSIPGroups(groups);
    } catch (error) {
      logPersistenceError(
        'Failed to save RSIP groups',
        { count: groups.length },
        error,
      );
    }
  };

  const savePolicyLibrary: SaveFns['savePolicyLibrary'] = async (entries) => {
    setSlice('rsipPolicyLibrary', entries);
    try {
      await storage.saveRSIPPolicyLibrary(entries);
    } catch (error) {
      logPersistenceError(
        'Failed to save RSIP policy library',
        { count: entries.length },
        error,
      );
    }
  };

  const saveRunHistory: SaveFns['saveRunHistory'] = async (records) => {
    setSlice('rsipRunHistory', records);
    try {
      await storage.saveRSIPRunHistory(records);
    } catch (error) {
      logPersistenceError(
        'Failed to save RSIP run history',
        { count: records.length },
        error,
      );
    }
  };

  const saveTaskLinks: SaveFns['saveTaskLinks'] = async (links) => {
    const normalized = rsipTaskIntegrationService.resolveLatestLinks(
      links.map((link) => ({
        ...link,
        updatedAt: ensureDate(link.updatedAt, new Date()),
      })),
    );

    setSlice('rsipTaskLinks', normalized);
    try {
      await storage.saveRSIPTaskLinks(normalized);
    } catch (error) {
      logPersistenceError(
        'Failed to save RSIP task links',
        { count: normalized.length },
        error,
      );
    }
  };

  const appendRunRecord: SaveFns['appendRunRecord'] = async (
    record,
    nextHistory,
  ) => {
    setSlice('rsipRunHistory', nextHistory);
    try {
      await storage.appendRSIPRunRecord(record);
    } catch (error) {
      logPersistenceError(
        'Failed to append RSIP run history',
        { runNumber: record.runNumber },
        error,
      );
    }
  };

  const upsertLibraryEntry: SaveFns['upsertLibraryEntry'] = async (
    entry,
    nextEntries,
  ) => {
    setSlice('rsipPolicyLibrary', nextEntries);
    try {
      await storage.upsertRSIPLibraryEntry(entry);
    } catch (error) {
      logPersistenceError(
        'Failed to upsert RSIP library entry',
        { entryId: entry.id },
        error,
      );
    }
  };

  const upsertNode: SaveFns['upsertNode'] = async (node, nextNodes) => {
    setSlice('rsipNodes', nextNodes);
    try {
      await storage.upsertRSIPNode(node);
    } catch (error) {
      logPersistenceError(
        'Failed to upsert RSIP node',
        { nodeId: node.id },
        error,
      );
    }
  };

  const removeNodes: SaveFns['removeNodes'] = async (nodeIds, nextNodes) => {
    setSlice('rsipNodes', nextNodes);
    try {
      await storage.removeRSIPNodes(nodeIds);
    } catch (error) {
      logPersistenceError('Failed to remove RSIP nodes', { nodeIds }, error);
    }
  };

  const saveNodes: SaveFns['saveNodes'] = async (nodes) => {
    const previousState = readState();
    setSlice('rsipNodes', nodes);

    try {
      await storage.saveRSIPNodes(nodes);
    } catch (error) {
      logPersistenceError(
        'Failed to save RSIP nodes',
        { nodeCount: nodes.length },
        error,
      );
    }

    const previousCount = previousState?.rsipNodes.length ?? 0;
    const meta = previousState?.rsipMeta;
    if (previousCount === 0 && nodes.length > 0 && meta) {
      await runOperations.startNewRun(meta);
    }
  };

  const saveFns: SaveFns = {
    appendExecutionRecord,
    appendRunRecord,
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
    archiveToLibrary: libraryOperations.archiveToLibrary,
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
