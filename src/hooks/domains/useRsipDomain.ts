import type { Dispatch, SetStateAction } from 'react';
import type {
  AppState,
  RSIPExecutionRecord,
  RSIPLibraryEntry,
  RSIPMeta,
  RSIPMode,
  RSIPNode,
  RSIPNodeGroup,
  RSIPRunRecord,
  RSIPStabilityPhase,
  RSIPTaskLink,
} from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import {
  getDescendantCount,
  getDescendantIds,
} from '../../utils/rsipTree';
import { logger } from '../../utils/logger';
import { toError } from '../../utils/errorHandling';
import {
  rsipTaskIntegrationService,
  type RSIPTaskEventPayload,
} from '../../services/rsip-integration/RSIPTaskIntegrationService';

const INTERNALIZATION_TARGET_DAYS = 60;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

interface MarkExecutionOptions {
  reinforce?: boolean;
  reasonCode?: string;
  repairHint?: string;
  sourceChainId?: string;
  sourceEvent?: string;
}

interface MarkViolationOptions {
  reasonCode?: string;
  repairHint?: string;
  sourceChainId?: string;
  sourceEvent?: string;
  collapseReason?: string;
}

interface UseRsipDomainParams {
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  getState?: () => AppState;
}

function computeInternalizationProgress(days: number): number {
  const raw = (Math.max(0, days) / INTERNALIZATION_TARGET_DAYS) * 100;
  return Math.min(100, Math.round(raw * 100) / 100);
}

function ensureDate(value: Date | undefined, fallback: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  return fallback;
}

function buildExecutionRecord(
  nodeId: string,
  status: RSIPExecutionRecord['status'],
  notes?: string,
  options?: MarkExecutionOptions | MarkViolationOptions,
): RSIPExecutionRecord {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    nodeId,
    executedAt: now,
    status,
    notes,
    reasonCode: options?.reasonCode,
    repairHint: options?.repairHint,
    sourceChainId: options?.sourceChainId,
    sourceEvent: options?.sourceEvent,
  };
}

export function useRsipDomain({
  setState,
  storage,
  getState,
}: UseRsipDomainParams) {
  const readState = (): AppState | null => {
    if (!getState) return null;
    return getState();
  };

  const openRSIP = () => {
    setState((prev) => ({ ...prev, currentView: 'rsip' }));
  };

  const appendExecutionRecord = async (record: RSIPExecutionRecord) => {
    setState((prev) => ({
      ...prev,
      rsipExecutionRecords: [...(prev.rsipExecutionRecords ?? []), record],
    }));

    try {
      await storage.appendRSIPExecutionRecord(record);
    } catch (error) {
      logger.error(
        'RSIP',
        'Failed to append RSIP execution record',
        { nodeId: record.nodeId, status: record.status },
        toError(error),
      );
    }
  };

  const saveNodes = async (nodes: RSIPNode[]) => {
    const previousState = readState();
    setState((prev) => ({ ...prev, rsipNodes: nodes }));

    try {
      await storage.saveRSIPNodes(nodes);
    } catch (error) {
      logger.error(
        'RSIP',
        'Failed to save RSIP nodes',
        { nodeCount: nodes.length },
        toError(error),
      );
    }

    const previousCount = previousState?.rsipNodes.length ?? 0;
    const meta = previousState?.rsipMeta;
    if (previousCount === 0 && nodes.length > 0 && meta) {
      await startNewRun(meta);
    }
  };

  const saveMeta = async (meta: RSIPMeta) => {
    setState((prev) => ({ ...prev, rsipMeta: meta }));
    try {
      await storage.saveRSIPMeta(meta);
    } catch (error) {
      logger.error(
        'RSIP',
        'Failed to save RSIP meta',
        { meta },
        toError(error),
      );
    }
  };

  const saveGroups = async (groups: RSIPNodeGroup[]) => {
    setState((prev) => ({ ...prev, rsipGroups: groups }));
    try {
      await storage.saveRSIPGroups(groups);
    } catch (error) {
      logger.error(
        'RSIP',
        'Failed to save RSIP groups',
        { count: groups.length },
        toError(error),
      );
    }
  };

  const savePolicyLibrary = async (entries: RSIPLibraryEntry[]) => {
    setState((prev) => ({ ...prev, rsipPolicyLibrary: entries }));
    try {
      await storage.saveRSIPPolicyLibrary(entries);
    } catch (error) {
      logger.error(
        'RSIP',
        'Failed to save RSIP policy library',
        { count: entries.length },
        toError(error),
      );
    }
  };

  const saveRunHistory = async (records: RSIPRunRecord[]) => {
    setState((prev) => ({ ...prev, rsipRunHistory: records }));
    try {
      await storage.saveRSIPRunHistory(records);
    } catch (error) {
      logger.error(
        'RSIP',
        'Failed to save RSIP run history',
        { count: records.length },
        toError(error),
      );
    }
  };

  const saveTaskLinks = async (links: RSIPTaskLink[]) => {
    const normalized = rsipTaskIntegrationService.resolveLatestLinks(
      links.map((link) => ({
        ...link,
        updatedAt: ensureDate(link.updatedAt, new Date()),
      })),
    );

    setState((prev) => ({ ...prev, rsipTaskLinks: normalized }));
    try {
      await storage.saveRSIPTaskLinks(normalized);
    } catch (error) {
      logger.error(
        'RSIP',
        'Failed to save RSIP task links',
        { count: normalized.length },
        toError(error),
      );
    }
  };

  const createGroup = async (
    title: string,
    faultTolerance: number,
    emoji?: string,
  ): Promise<RSIPNodeGroup> => {
    const state = readState();
    const nextGroup: RSIPNodeGroup = {
      id: crypto.randomUUID(),
      title: title.trim(),
      faultTolerance: Math.max(0, Math.floor(faultTolerance)),
      emoji,
      createdAt: new Date(),
    };
    const nextGroups = [...(state?.rsipGroups ?? []), nextGroup];
    await saveGroups(nextGroups);
    return nextGroup;
  };

  const isGroupAlive = (
    groupId: string,
    nodes?: RSIPNode[],
    groups?: RSIPNodeGroup[],
  ): boolean => {
    const state = readState();
    const allNodes = nodes ?? state?.rsipNodes ?? [];
    const allGroups = groups ?? state?.rsipGroups ?? [];
    const group = allGroups.find((item) => item.id === groupId);
    if (!group) return false;

    const aliveCount = allNodes.filter((item) => item.groupId === groupId).length;
    if (aliveCount === 0) return false;

    // Current model stores only alive nodes, so we keep this as a conservative check.
    return aliveCount > 0 || group.faultTolerance > 0;
  };

  const archiveToLibrary = async (
    node: RSIPNode,
    existingLibrary?: RSIPLibraryEntry[],
  ): Promise<RSIPLibraryEntry[]> => {
    const state = readState();
    const library = existingLibrary ?? state?.rsipPolicyLibrary ?? [];
    const now = new Date();
    const cumulativeDelta = Math.max(
      0,
      node.cumulativeExecutionDays ?? node.totalExecutions ?? 0,
    );

    const existingIndex = library.findIndex((entry) => entry.id === node.id);
    if (existingIndex >= 0) {
      const current = library[existingIndex];
      const cumulativeExecutionDays =
        current.cumulativeExecutionDays + cumulativeDelta;
      const updated: RSIPLibraryEntry = {
        ...current,
        title: node.title,
        rule: node.rule,
        type: node.type ?? current.type,
        emoji: node.emoji ?? current.emoji,
        useTimer: node.useTimer ?? current.useTimer,
        timerMinutes: node.timerMinutes ?? current.timerMinutes,
        isPassive: node.isPassive ?? current.isPassive,
        cumulativeExecutionDays,
        internalizationProgress:
          computeInternalizationProgress(cumulativeExecutionDays),
        lastActiveAt: now,
        timesUsed: current.timesUsed + 1,
      };

      const next = [...library];
      next.splice(existingIndex, 1, updated);
      await savePolicyLibrary(next);
      return next;
    }

    const cumulativeExecutionDays = cumulativeDelta;
    const created: RSIPLibraryEntry = {
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
    const next = [...library, created];
    await savePolicyLibrary(next);
    return next;
  };

  const restoreFromLibrary = async (
    entryId: string,
    parentId?: string,
  ): Promise<RSIPNode | null> => {
    const state = readState();
    if (!state) return null;

    const entry = (state.rsipPolicyLibrary ?? []).find((item) => item.id === entryId);
    if (!entry) return null;

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

    await saveNodes([...state.rsipNodes, node]);

    const updatedLibrary = (state.rsipPolicyLibrary ?? []).map((item) =>
      item.id === entryId
        ? {
            ...item,
            lastActiveAt: now,
            timesUsed: item.timesUsed + 1,
          }
        : item,
    );
    await savePolicyLibrary(updatedLibrary);

    return node;
  };

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

    await Promise.all([saveRunHistory(nextHistory), saveMeta(nextMeta)]);
    return nextMeta;
  };

  const startNewRun = async (meta: RSIPMeta): Promise<RSIPMeta> => {
    if (meta.currentRunNumber && meta.currentRunStartedAt) return meta;

    const nextMeta: RSIPMeta = {
      ...meta,
      currentRunNumber: meta.currentRunNumber ?? 1,
      currentRunStartedAt: meta.currentRunStartedAt ?? new Date(),
    };
    await saveMeta(nextMeta);
    return nextMeta;
  };

  const getMode = (meta: RSIPMeta): RSIPMode => {
    return meta.allowMultiplePerDay ? 'free' : 'strict';
  };

  const isStrictMode = (meta: RSIPMeta): boolean => {
    return !meta.allowMultiplePerDay;
  };

  const reinforceNode = async (
    nodeId: string,
    nodes: RSIPNode[],
    levelDelta = 1,
  ): Promise<RSIPNode[]> => {
    const delta = Math.max(1, Math.floor(levelDelta));
    const updatedNodes = nodes.map((node) => {
      if (node.id !== nodeId) return node;
      if ((node.stabilityPhase ?? 'E0') !== 'E2') return node;

      const reinforcementLevel = (node.reinforcementLevel ?? 0) + delta;
      return {
        ...node,
        reinforcementLevel,
        maxReinforcementLevel: Math.max(
          node.maxReinforcementLevel ?? 0,
          reinforcementLevel,
        ),
      };
    });

    await saveNodes(updatedNodes);
    return updatedNodes;
  };

  const markExecuted = async (
    nodeId: string,
    nodes: RSIPNode[],
    notes?: string,
    options?: MarkExecutionOptions,
  ): Promise<RSIPNode[]> => {
    const now = new Date();
    const updatedNodes = nodes.map((node) => {
      if (node.id !== nodeId) return node;

      const consecutiveExecutions = (node.consecutiveExecutions ?? 0) + 1;
      const totalExecutions = (node.totalExecutions ?? 0) + 1;
      const cumulativeExecutionDays = (node.cumulativeExecutionDays ?? 0) + 1;

      let stabilityPhase: RSIPStabilityPhase = node.stabilityPhase ?? 'E0';
      let phaseStartedAt = node.phaseStartedAt;

      if (stabilityPhase === 'E0' && consecutiveExecutions >= 7) {
        stabilityPhase = 'E1';
        phaseStartedAt = now;
      } else if (stabilityPhase === 'E1' && consecutiveExecutions >= 21) {
        stabilityPhase = 'E2';
        phaseStartedAt = now;
      }

      let reinforcementLevel = node.reinforcementLevel ?? 0;
      let maxReinforcementLevel = node.maxReinforcementLevel ?? 0;
      if (stabilityPhase === 'E2' && options?.reinforce) {
        reinforcementLevel += 1;
        maxReinforcementLevel = Math.max(
          maxReinforcementLevel,
          reinforcementLevel,
        );
      }

      return {
        ...node,
        lastExecutedAt: now,
        consecutiveExecutions,
        consecutiveViolations: 0,
        totalExecutions,
        stabilityPhase,
        phaseStartedAt,
        cumulativeExecutionDays,
        reinforcementLevel,
        maxReinforcementLevel,
      };
    });

    await saveNodes(updatedNodes);
    await appendExecutionRecord(
      buildExecutionRecord(nodeId, 'executed', notes, options),
    );
    return updatedNodes;
  };

  const markViolated = async (
    nodeId: string,
    nodes: RSIPNode[],
    notes?: string,
    options?: MarkViolationOptions,
  ): Promise<RSIPNode[]> => {
    const state = readState();
    const now = new Date();
    const targetNode = nodes.find((node) => node.id === nodeId);
    if (!targetNode) return nodes;

    // 1) Reinforcement shield first.
    const currentReinforcement = targetNode.reinforcementLevel ?? 0;
    if (currentReinforcement > 0) {
      const updatedNodes = nodes.map((node) => {
        if (node.id !== nodeId) return node;
        return {
          ...node,
          reinforcementLevel: Math.max(0, currentReinforcement - 1),
          lastViolatedAt: now,
          consecutiveViolations: (node.consecutiveViolations ?? 0) + 1,
          totalViolations: (node.totalViolations ?? 0) + 1,
          consecutiveExecutions: 0,
        };
      });

      await saveNodes(updatedNodes);
      await appendExecutionRecord(
        buildExecutionRecord(nodeId, 'violated', notes, options),
      );
      return updatedNodes;
    }

    const groups = state?.rsipGroups ?? [];
    const group = targetNode.groupId
      ? groups.find((item) => item.id === targetNode.groupId)
      : undefined;

    const removedIds = new Set<string>();
    const addSubtree = (rootId: string) => {
      removedIds.add(rootId);
      for (const descendantId of getDescendantIds(nodes, rootId)) {
        removedIds.add(descendantId);
      }
    };

    let triggeredGroupCollapse = false;
    if (group) {
      const groupNodes = nodes.filter((node) => node.groupId === group.id);
      const survivorsAfterLoss = groupNodes.length - 1;
      const minAlive = Math.max(0, groupNodes.length - group.faultTolerance);

      // 2) Group fault tolerance check before normal cascade.
      if (survivorsAfterLoss >= minAlive) {
        addSubtree(nodeId);
      } else {
        triggeredGroupCollapse = true;
        for (const groupNode of groupNodes) {
          addSubtree(groupNode.id);
        }
      }
    } else {
      // 3) Normal recursive rollback.
      addSubtree(nodeId);
    }

    const removedNodes = nodes.filter((node) => removedIds.has(node.id));
    const updatedNodes = nodes.filter((node) => !removedIds.has(node.id));

    // Archive removed nodes into policy library.
    let updatedLibrary = state?.rsipPolicyLibrary ?? [];
    for (const removedNode of removedNodes) {
      updatedLibrary = await archiveToLibrary(removedNode, updatedLibrary);
    }

    await saveNodes(updatedNodes);
    await appendExecutionRecord(
      buildExecutionRecord(nodeId, 'violated', notes, options),
    );

    const collapsedRootNode = targetNode.parentId == null;
    const shouldRecordCollapse =
      triggeredGroupCollapse || collapsedRootNode || updatedNodes.length === 0;

    if (shouldRecordCollapse) {
      await recordCollapse(
        state?.rsipMeta ?? {},
        options?.collapseReason ?? options?.reasonCode ?? notes,
        targetNode.title,
        nodes.length,
      );
    }

    return updatedNodes;
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

    await saveMeta(updatedMeta);
    return updatedMeta;
  };

  const hasOpenedToday = (meta: RSIPMeta): boolean => {
    if (!meta.lastTreeOpenedAt) return false;
    return meta.lastTreeOpenedAt.toDateString() === new Date().toDateString();
  };

  const calculateConstraintPower = (
    nodeId: string,
    nodes: RSIPNode[],
  ): { descendantCount: number; failureCost: number } => {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return { descendantCount: 0, failureCost: 0 };

    const descendantCount = getDescendantCount(nodes, nodeId);

    const phaseWeight: Record<RSIPStabilityPhase, number> = {
      E0: 1,
      E1: 2,
      E2: 3,
    };
    const weight = phaseWeight[node.stabilityPhase ?? 'E0'];
    const reinforcementMultiplier = (node.reinforcementLevel ?? 0) > 0 ? 0.3 : 1;
    const failureCost = Math.round(
      (descendantCount + 1) * weight * reinforcementMultiplier * 100,
    ) / 100;

    return { descendantCount, failureCost };
  };

  const calculatePhaseDistribution = (
    nodes: RSIPNode[],
  ): { E0: number; E1: number; E2: number } => {
    const distribution = { E0: 0, E1: 0, E2: 0 };
    for (const node of nodes) {
      const phase = node.stabilityPhase ?? 'E0';
      distribution[phase]++;
    }
    return distribution;
  };

  const upsertTaskLinks = async (links: RSIPTaskLink[]) => {
    const state = readState();
    const merged = rsipTaskIntegrationService.upsertLinks(
      state?.rsipTaskLinks ?? [],
      links,
    );
    await saveTaskLinks(merged);
    return merged;
  };

  const handleTaskEventIntegration = async (
    payload: RSIPTaskEventPayload,
  ): Promise<RSIPNode[]> => {
    const state = readState();
    if (!state) return [];

    const matches = rsipTaskIntegrationService.matchTaskEventLinks(
      state.rsipTaskLinks ?? [],
      payload,
    );

    let latestNodes = state.rsipNodes;
    for (const match of matches) {
      if (match.deduped) continue;

      const nodeExists = latestNodes.some(
        (node) => node.id === match.link.rsipNodeId,
      );
      if (!nodeExists) {
        logger.warn('RSIP', 'RSIP integration skipped: target node missing', {
          event: payload.event,
          rsipNodeId: match.link.rsipNodeId,
          chainId: payload.chainId,
        });
        continue;
      }

      if (match.link.effect === 'mark_rsip_executed') {
        latestNodes = await markExecuted(
          match.link.rsipNodeId,
          latestNodes,
          undefined,
          {
            sourceChainId: payload.chainId,
            sourceEvent: payload.event,
            reasonCode: 'integration_task_completed',
          },
        );
      } else if (match.link.effect === 'mark_rsip_violated') {
        latestNodes = await markViolated(
          match.link.rsipNodeId,
          latestNodes,
          undefined,
          {
            sourceChainId: payload.chainId,
            sourceEvent: payload.event,
            reasonCode: 'integration_task_interrupted',
          },
        );
      }
    }

    return latestNodes;
  };

  const getRsipTaskActions = (rsipNodeId: string): RSIPTaskLink[] => {
    const state = readState();
    return rsipTaskIntegrationService.getRsipToTaskLinks(
      state?.rsipTaskLinks ?? [],
      rsipNodeId,
    );
  };

  return {
    openRSIP,
    saveNodes,
    saveMeta,
    saveGroups,
    savePolicyLibrary,
    saveRunHistory,
    saveTaskLinks,
    upsertTaskLinks,
    createGroup,
    isGroupAlive,
    archiveToLibrary,
    restoreFromLibrary,
    recordCollapse,
    startNewRun,
    getMode,
    isStrictMode,
    markExecuted,
    markViolated,
    reinforceNode,
    recordTreeOpened,
    hasOpenedToday,
    calculateConstraintPower,
    calculatePhaseDistribution,
    handleTaskEventIntegration,
    getRsipTaskActions,
  };
}
