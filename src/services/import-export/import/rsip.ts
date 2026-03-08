import type {
  RSIPExecutionRecord,
  RSIPLibraryEntry,
  RSIPMeta,
  RSIPNode,
  RSIPNodeGroup,
  RSIPRunRecord,
  RSIPStabilityPhase,
  RSIPTaskLink,
} from '../../../types';
import {
  getTrimmedNonEmptyString,
  isRecord,
  parseDateOrUndefined,
  parseTruthyDateOrNow,
  parseTruthyDateOrUndefined,
  toNumber,
  toOptionalBoolean,
  toOptionalNumber,
  toOptionalString,
} from '../../../serialization/primitives';
import type { ImportTranslator } from './types';
import { generateId } from './id';

const RSIP_STABILITY_PHASES: RSIPStabilityPhase[] = ['E0', 'E1', 'E2'];
const RSIP_EXECUTION_STATUSES: RSIPExecutionRecord['status'][] = [
  'pending',
  'executed',
  'violated',
  'skipped',
];
const RSIP_TASK_LINK_CHAIN_KINDS: RSIPTaskLink['chainKind'][] = [
  'group',
  'unit',
];
const RSIP_TASK_LINK_TRIGGER_EVENTS: RSIPTaskLink['triggerEvent'][] = [
  'task_completed',
  'task_interrupted',
  'group_cycle_completed',
  'rsip_mark_executed',
];
const RSIP_TASK_LINK_EFFECTS: RSIPTaskLink['effect'][] = [
  'mark_rsip_executed',
  'mark_rsip_violated',
  'prompt_start_chain',
  'prompt_schedule_chain',
];
const RSIP_TASK_LINK_AUTOMATIONS: RSIPTaskLink['automation'][] = [
  'auto',
  'confirm',
];

function parseEnumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  if (typeof value !== 'string') return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function buildMappedId(
  sourceId: string | undefined,
  idMap: Map<string, string>,
  fallbackPrefix: string,
): string {
  if (sourceId) {
    const mapped = idMap.get(sourceId);
    if (mapped) return mapped;
  }
  return generateId(fallbackPrefix);
}

function buildIdMap(
  rawItems: unknown[],
  existingIds: Set<string>,
  prefix: string,
): Map<string, string> {
  const idMap = new Map<string, string>();

  for (const raw of rawItems) {
    if (!isRecord(raw)) continue;

    const sourceId =
      getTrimmedNonEmptyString(raw.id) ?? generateId(`${prefix}-source`);

    let nextId = generateId(prefix);
    while (existingIds.has(nextId)) nextId = generateId(prefix);

    idMap.set(sourceId, nextId);
    existingIds.add(nextId);
  }

  return idMap;
}

function getStringFromCandidates(
  raw: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = getTrimmedNonEmptyString(raw[key]);
    if (value) return value;
  }
  return undefined;
}

function parsePhaseDistribution(
  phaseDistribution: unknown,
): RSIPMeta['phaseDistribution'] | undefined {
  if (!isRecord(phaseDistribution)) return undefined;
  return {
    E0: toNumber(phaseDistribution.E0, 0),
    E1: toNumber(phaseDistribution.E1, 0),
    E2: toNumber(phaseDistribution.E2, 0),
  };
}

function mapRsipParentId(
  raw: Record<string, unknown>,
  idMapRsip: Map<string, string>,
): string | undefined {
  const sourceParentId = getStringFromCandidates(raw, [
    'parentId',
    'parent_id',
  ]);
  if (!sourceParentId) return undefined;
  return idMapRsip.get(sourceParentId) ?? sourceParentId;
}

function mapRsipGroupId(
  raw: Record<string, unknown>,
  groupIdMap: Map<string, string> | undefined,
): string | undefined {
  const sourceGroupId = getStringFromCandidates(raw, ['groupId', 'group_id']);
  if (!sourceGroupId) return undefined;
  if (!groupIdMap) return sourceGroupId;
  return groupIdMap.get(sourceGroupId);
}

function mapImportedRsipNode(
  raw: Record<string, unknown>,
  idMapRsip: Map<string, string>,
  groupIdMap: Map<string, string> | undefined,
  tr: ImportTranslator,
): RSIPNode {
  const sourceId = getTrimmedNonEmptyString(raw.id);
  const id = buildMappedId(sourceId, idMapRsip, 'rsip');

  return {
    id,
    parentId: mapRsipParentId(raw, idMapRsip),
    title: String(raw.title ?? tr('未命名国策', 'Untitled policy')),
    rule: String(raw.rule ?? ''),
    sortOrder: toNumber(raw.sortOrder, Math.floor(Date.now() / 1000)),
    createdAt: parseTruthyDateOrNow(raw.createdAt),
    useTimer: toOptionalBoolean(raw.useTimer),
    timerMinutes: toOptionalNumber(raw.timerMinutes),
    emoji: toOptionalString(raw.emoji),
    type: toOptionalString(raw.type),
    groupId: mapRsipGroupId(raw, groupIdMap),
    reinforcementLevel: toOptionalNumber(raw.reinforcementLevel),
    maxReinforcementLevel: toOptionalNumber(raw.maxReinforcementLevel),
    cumulativeExecutionDays: toOptionalNumber(raw.cumulativeExecutionDays),
    isPassive: toOptionalBoolean(raw.isPassive),
    splitFromGoal: toOptionalString(raw.splitFromGoal),
    stabilityPhase: parseEnumValue(raw.stabilityPhase, RSIP_STABILITY_PHASES),
    phaseStartedAt: parseTruthyDateOrUndefined(raw.phaseStartedAt),
    lastExecutedAt: parseTruthyDateOrUndefined(raw.lastExecutedAt),
    lastViolatedAt: parseTruthyDateOrUndefined(raw.lastViolatedAt),
    consecutiveExecutions: toOptionalNumber(raw.consecutiveExecutions),
    consecutiveViolations: toOptionalNumber(raw.consecutiveViolations),
    totalExecutions: toOptionalNumber(raw.totalExecutions),
    totalViolations: toOptionalNumber(raw.totalViolations),
  };
}

export function parseImportRsipNodes(
  rsipNodes: unknown,
  existingRsipNodes: RSIPNode[] | undefined,
  tr: ImportTranslator,
  groupIdMap?: Map<string, string>,
): { nodes: RSIPNode[]; rsipIdMap: Map<string, string> } {
  if (!Array.isArray(rsipNodes)) return { nodes: [], rsipIdMap: new Map() };

  const existingIds = new Set((existingRsipNodes || []).map((n) => n.id));
  const rsipIdMap = buildIdMap(rsipNodes, existingIds, 'rsip');

  const nodes: RSIPNode[] = [];
  for (const raw of rsipNodes) {
    if (!isRecord(raw)) continue;
    nodes.push(mapImportedRsipNode(raw, rsipIdMap, groupIdMap, tr));
  }

  return { nodes, rsipIdMap };
}

export function parseImportRsipMeta(rsipMeta: unknown): RSIPMeta | undefined {
  if (!isRecord(rsipMeta)) return undefined;

  return {
    lastAddedAt: parseDateOrUndefined(rsipMeta.lastAddedAt),
    allowMultiplePerDay: toOptionalBoolean(rsipMeta.allowMultiplePerDay),
    lastTreeOpenedAt: parseDateOrUndefined(rsipMeta.lastTreeOpenedAt),
    dailyTreeOpenRequired: toOptionalBoolean(rsipMeta.dailyTreeOpenRequired),
    treeOpenStreak: toOptionalNumber(rsipMeta.treeOpenStreak),
    phaseDistribution: parsePhaseDistribution(rsipMeta.phaseDistribution),
    currentRunNumber: toOptionalNumber(rsipMeta.currentRunNumber),
    currentRunStartedAt: parseDateOrUndefined(rsipMeta.currentRunStartedAt),
  };
}

export function parseImportRsipGroups(
  rsipGroups: unknown,
  existingGroups: RSIPNodeGroup[] | undefined,
): { groups: RSIPNodeGroup[]; groupIdMap: Map<string, string> } {
  if (!Array.isArray(rsipGroups))
    return { groups: [], groupIdMap: new Map<string, string>() };

  const existingIds = new Set((existingGroups || []).map((g) => g.id));
  const groupIdMap = buildIdMap(rsipGroups, existingIds, 'rsip-group');
  const groups: RSIPNodeGroup[] = [];

  for (const raw of rsipGroups) {
    if (!isRecord(raw)) continue;

    const sourceId = getTrimmedNonEmptyString(raw.id);
    const id = buildMappedId(sourceId, groupIdMap, 'rsip-group');

    groups.push({
      id,
      title: String(raw.title ?? ''),
      faultTolerance: Math.max(0, toNumber(raw.faultTolerance, 0)),
      createdAt: parseTruthyDateOrNow(raw.createdAt),
      emoji: toOptionalString(raw.emoji),
    });
  }

  return { groups, groupIdMap };
}

export function parseImportRsipLibrary(
  rsipPolicyLibrary: unknown,
): RSIPLibraryEntry[] {
  if (!Array.isArray(rsipPolicyLibrary)) return [];

  return rsipPolicyLibrary
    .filter((raw): raw is Record<string, unknown> => isRecord(raw))
    .map((raw) => ({
      id: generateId('rsip-lib'),
      title: String(raw.title ?? ''),
      rule: String(raw.rule ?? ''),
      type: toOptionalString(raw.type),
      emoji: toOptionalString(raw.emoji),
      cumulativeExecutionDays: Math.max(
        0,
        toNumber(raw.cumulativeExecutionDays, 0),
      ),
      internalizationProgress: Math.max(
        0,
        toNumber(raw.internalizationProgress, 0),
      ),
      lastActiveAt: parseTruthyDateOrNow(raw.lastActiveAt),
      timesUsed: Math.max(0, toNumber(raw.timesUsed, 0)),
      useTimer: toOptionalBoolean(raw.useTimer),
      timerMinutes: toOptionalNumber(raw.timerMinutes),
      isPassive: toOptionalBoolean(raw.isPassive),
    }));
}

export function parseImportRsipRunHistory(
  rsipRunHistory: unknown,
): RSIPRunRecord[] {
  if (!Array.isArray(rsipRunHistory)) return [];

  return rsipRunHistory
    .filter((raw): raw is Record<string, unknown> => isRecord(raw))
    .map((raw, index) => ({
      runNumber: Math.max(1, toNumber(raw.runNumber, index + 1)),
      startedAt: parseTruthyDateOrNow(raw.startedAt),
      endedAt: parseTruthyDateOrUndefined(raw.endedAt),
      maxNodeCount: Math.max(0, toNumber(raw.maxNodeCount, 0)),
      durationDays: Math.max(0, toNumber(raw.durationDays, 0)),
      collapseReason: toOptionalString(raw.collapseReason),
      collapseNodeTitle: toOptionalString(raw.collapseNodeTitle),
    }));
}

export function parseImportRsipExecutionRecords(
  rsipExecutionRecords: unknown,
  rsipIdMap: Map<string, string>,
): { records: RSIPExecutionRecord[]; skipped: number } {
  if (!Array.isArray(rsipExecutionRecords)) return { records: [], skipped: 0 };

  const records: RSIPExecutionRecord[] = [];
  let skipped = 0;

  for (const raw of rsipExecutionRecords) {
    if (!isRecord(raw)) {
      skipped += 1;
      continue;
    }

    const sourceNodeId = getStringFromCandidates(raw, ['nodeId', 'node_id']);
    if (!sourceNodeId) {
      skipped += 1;
      continue;
    }

    const nodeId = rsipIdMap.get(sourceNodeId);
    if (!nodeId) {
      skipped += 1;
      continue;
    }

    records.push({
      id: generateId('rsip-exec'),
      nodeId,
      executedAt: parseTruthyDateOrNow(raw.executedAt),
      status:
        parseEnumValue(raw.status, RSIP_EXECUTION_STATUSES) ??
        RSIP_EXECUTION_STATUSES[0],
      notes: toOptionalString(raw.notes),
      reasonCode: toOptionalString(raw.reasonCode),
      repairHint: toOptionalString(raw.repairHint),
      sourceChainId: toOptionalString(raw.sourceChainId),
      sourceEvent: toOptionalString(raw.sourceEvent),
    });
  }

  return { records, skipped };
}

export function parseImportRsipTaskLinks(
  rsipTaskLinks: unknown,
  rsipIdMap: Map<string, string>,
  chainIdMap: Map<string, string>,
): { links: RSIPTaskLink[]; skipped: number } {
  if (!Array.isArray(rsipTaskLinks)) return { links: [], skipped: 0 };

  const links: RSIPTaskLink[] = [];
  let skipped = 0;

  for (const raw of rsipTaskLinks) {
    if (!isRecord(raw)) {
      skipped += 1;
      continue;
    }

    const sourceNodeId = getStringFromCandidates(raw, [
      'rsipNodeId',
      'rsip_node_id',
    ]);
    const sourceChainId = getStringFromCandidates(raw, ['chainId', 'chain_id']);
    if (!sourceNodeId || !sourceChainId) {
      skipped += 1;
      continue;
    }

    const rsipNodeId = rsipIdMap.get(sourceNodeId);
    const chainId = chainIdMap.get(sourceChainId);
    if (!rsipNodeId || !chainId) {
      skipped += 1;
      continue;
    }

    links.push({
      id: generateId('rsip-link'),
      rsipNodeId,
      chainId,
      chainKind:
        parseEnumValue(raw.chainKind, RSIP_TASK_LINK_CHAIN_KINDS) ??
        RSIP_TASK_LINK_CHAIN_KINDS[1],
      triggerEvent:
        parseEnumValue(raw.triggerEvent, RSIP_TASK_LINK_TRIGGER_EVENTS) ??
        RSIP_TASK_LINK_TRIGGER_EVENTS[0],
      effect:
        parseEnumValue(raw.effect, RSIP_TASK_LINK_EFFECTS) ??
        RSIP_TASK_LINK_EFFECTS[0],
      automation:
        parseEnumValue(raw.automation, RSIP_TASK_LINK_AUTOMATIONS) ??
        RSIP_TASK_LINK_AUTOMATIONS[1],
      isActive: raw.isActive != null ? Boolean(raw.isActive) : true,
      updatedAt: parseTruthyDateOrNow(raw.updatedAt),
    });
  }

  return { links, skipped };
}
