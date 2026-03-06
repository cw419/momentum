import type {
  RSIPExecutionRecord,
  RSIPLibraryEntry,
  RSIPMeta,
  RSIPNode,
  RSIPNodeGroup,
  RSIPRunRecord,
  RSIPTaskLink,
} from '../../types';
import { STORAGE_KEYS } from './keys';

interface RawNodeData {
  createdAt: string;
}

export function getRSIPNodes(): RSIPNode[] {
  const data = localStorage.getItem(STORAGE_KEYS.RSIP_NODES);
  if (!data) return [];

  return JSON.parse(data).map(
    (node: RawNodeData & Record<string, unknown>) => ({
      ...node,
      createdAt: new Date(node.createdAt),
      phaseStartedAt:
        typeof node.phaseStartedAt === 'string'
          ? new Date(node.phaseStartedAt)
          : undefined,
      lastExecutedAt:
        typeof node.lastExecutedAt === 'string'
          ? new Date(node.lastExecutedAt)
          : undefined,
      lastViolatedAt:
        typeof node.lastViolatedAt === 'string'
          ? new Date(node.lastViolatedAt)
          : undefined,
    }),
  );
}

export function saveRSIPNodes(nodes: RSIPNode[]): void {
  localStorage.setItem(STORAGE_KEYS.RSIP_NODES, JSON.stringify(nodes));
}

export function getRSIPMeta(): RSIPMeta {
  const data = localStorage.getItem(STORAGE_KEYS.RSIP_META);
  if (!data) return {};

  const parsed = JSON.parse(data) as {
    lastAddedAt?: string;
    allowMultiplePerDay?: boolean;
    lastTreeOpenedAt?: string;
    treeOpenStreak?: number;
    dailyTreeOpenRequired?: boolean;
    currentRunNumber?: number;
    currentRunStartedAt?: string;
  };
  return {
    lastAddedAt: parsed.lastAddedAt ? new Date(parsed.lastAddedAt) : undefined,
    allowMultiplePerDay: !!parsed.allowMultiplePerDay,
    lastTreeOpenedAt: parsed.lastTreeOpenedAt
      ? new Date(parsed.lastTreeOpenedAt)
      : undefined,
    treeOpenStreak: parsed.treeOpenStreak ?? 0,
    dailyTreeOpenRequired: parsed.dailyTreeOpenRequired ?? false,
    currentRunNumber: parsed.currentRunNumber,
    currentRunStartedAt: parsed.currentRunStartedAt
      ? new Date(parsed.currentRunStartedAt)
      : undefined,
  } as RSIPMeta;
}

export function saveRSIPMeta(meta: RSIPMeta): void {
  localStorage.setItem(
    STORAGE_KEYS.RSIP_META,
    JSON.stringify({
      ...meta,
      lastAddedAt: meta.lastAddedAt
        ? meta.lastAddedAt.toISOString()
        : undefined,
      lastTreeOpenedAt: meta.lastTreeOpenedAt
        ? meta.lastTreeOpenedAt.toISOString()
        : undefined,
      currentRunStartedAt: meta.currentRunStartedAt
        ? meta.currentRunStartedAt.toISOString()
        : undefined,
      allowMultiplePerDay: !!meta.allowMultiplePerDay,
    }),
  );
}

function parseDate<T extends Record<string, unknown>>(
  value: T,
  key: keyof T,
): Date | undefined {
  const raw = value[key];
  if (typeof raw !== 'string') return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function getRSIPGroups(): RSIPNodeGroup[] {
  const data = localStorage.getItem(STORAGE_KEYS.RSIP_GROUPS);
  if (!data) return [];

  return (JSON.parse(data) as Record<string, unknown>[]).map((group) => ({
    ...(group as unknown as RSIPNodeGroup),
    createdAt: parseDate(group, 'createdAt') ?? new Date(),
  }));
}

export function saveRSIPGroups(groups: RSIPNodeGroup[]): void {
  localStorage.setItem(STORAGE_KEYS.RSIP_GROUPS, JSON.stringify(groups));
}

export function getRSIPPolicyLibrary(): RSIPLibraryEntry[] {
  const data = localStorage.getItem(STORAGE_KEYS.RSIP_POLICY_LIBRARY);
  if (!data) return [];

  return (JSON.parse(data) as Record<string, unknown>[]).map((entry) => ({
    ...(entry as unknown as RSIPLibraryEntry),
    lastActiveAt: parseDate(entry, 'lastActiveAt') ?? new Date(),
  }));
}

export function saveRSIPPolicyLibrary(entries: RSIPLibraryEntry[]): void {
  localStorage.setItem(
    STORAGE_KEYS.RSIP_POLICY_LIBRARY,
    JSON.stringify(entries),
  );
}

export function getRSIPRunHistory(): RSIPRunRecord[] {
  const data = localStorage.getItem(STORAGE_KEYS.RSIP_RUN_HISTORY);
  if (!data) return [];

  return (JSON.parse(data) as Record<string, unknown>[]).map((record) => ({
    ...(record as unknown as RSIPRunRecord),
    startedAt: parseDate(record, 'startedAt') ?? new Date(),
    endedAt: parseDate(record, 'endedAt'),
  }));
}

export function saveRSIPRunHistory(records: RSIPRunRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.RSIP_RUN_HISTORY, JSON.stringify(records));
}

export function getRSIPTaskLinks(): RSIPTaskLink[] {
  const data = localStorage.getItem(STORAGE_KEYS.RSIP_TASK_LINKS);
  if (!data) return [];

  return (JSON.parse(data) as Record<string, unknown>[]).map((link) => ({
    ...(link as unknown as RSIPTaskLink),
    updatedAt: parseDate(link, 'updatedAt') ?? new Date(),
  }));
}

export function saveRSIPTaskLinks(links: RSIPTaskLink[]): void {
  localStorage.setItem(STORAGE_KEYS.RSIP_TASK_LINKS, JSON.stringify(links));
}

export function getRSIPExecutionRecords(): RSIPExecutionRecord[] {
  const data = localStorage.getItem(STORAGE_KEYS.RSIP_EXECUTION_RECORDS);
  if (!data) return [];

  return (JSON.parse(data) as Record<string, unknown>[]).map((record) => ({
    ...(record as unknown as RSIPExecutionRecord),
    executedAt: parseDate(record, 'executedAt') ?? new Date(),
  }));
}

export function appendRSIPExecutionRecord(record: RSIPExecutionRecord): void {
  const current = getRSIPExecutionRecords();
  current.push(record);
  localStorage.setItem(
    STORAGE_KEYS.RSIP_EXECUTION_RECORDS,
    JSON.stringify(current),
  );
}
