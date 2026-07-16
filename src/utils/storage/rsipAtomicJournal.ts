import { STORAGE_KEYS } from './keys';

const RSIP_JOURNAL_VERSION = 2;

type SerializedRecord = Record<string, unknown>;

export interface IndexedRSIPSnapshot {
  index: number;
  value: SerializedRecord;
}

interface CreateNodesWithMetaIntent {
  kind: 'create_nodes_with_meta';
  nodesToAdd: SerializedRecord[];
  nextMeta: SerializedRecord;
  previousMeta: SerializedRecord | null;
}

interface ArchiveNodesIntent {
  kind: 'archive_nodes';
  removedNodes: IndexedRSIPSnapshot[];
  nextEntries: SerializedRecord[];
  previousEntries: IndexedRSIPSnapshot[];
}

export type RSIPAtomicIntent = CreateNodesWithMetaIntent | ArchiveNodesIntent;

type RSIPAtomicJournal = RSIPAtomicIntent & {
  version: typeof RSIP_JOURNAL_VERSION;
};

function isRecord(value: unknown): value is SerializedRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStringId(
  value: SerializedRecord,
): value is SerializedRecord & { id: string } {
  return typeof value.id === 'string';
}

function isIndexedSnapshot(value: unknown): value is IndexedRSIPSnapshot {
  return (
    isRecord(value) &&
    Number.isInteger(value.index) &&
    Number(value.index) >= 0 &&
    isRecord(value.value) &&
    hasStringId(value.value)
  );
}

function decodeJournal(raw: string): RSIPAtomicJournal {
  const value = JSON.parse(raw) as Partial<RSIPAtomicJournal>;
  if (value.version !== RSIP_JOURNAL_VERSION) {
    throw new Error('Invalid RSIP atomic journal version');
  }

  if (
    value.kind === 'create_nodes_with_meta' &&
    Array.isArray(value.nodesToAdd) &&
    value.nodesToAdd.every((node) => isRecord(node) && hasStringId(node)) &&
    isRecord(value.nextMeta) &&
    (value.previousMeta === null || isRecord(value.previousMeta))
  ) {
    return value as RSIPAtomicJournal;
  }

  if (
    value.kind === 'archive_nodes' &&
    Array.isArray(value.removedNodes) &&
    value.removedNodes.every(isIndexedSnapshot) &&
    Array.isArray(value.nextEntries) &&
    value.nextEntries.every((entry) => isRecord(entry) && hasStringId(entry)) &&
    Array.isArray(value.previousEntries) &&
    value.previousEntries.every(isIndexedSnapshot)
  ) {
    return value as RSIPAtomicJournal;
  }

  throw new Error('Invalid RSIP atomic journal');
}

function readStoredRecords(key: string): SerializedRecord[] {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return [];
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || !parsed.every(isRecord)) {
    throw new Error(`Invalid RSIP collection at ${key}`);
  }
  return parsed;
}

function recordId(value: SerializedRecord): string {
  if (!hasStringId(value)) {
    throw new Error('RSIP journal record is missing an id');
  }
  return value.id;
}

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJson);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalizeJson(value[key])]),
    );
  }
  return value;
}

function recordsEqual(
  left: SerializedRecord | null | undefined,
  right: SerializedRecord | null | undefined,
): boolean {
  if (left == null || right == null) {
    return left === right;
  }
  return (
    JSON.stringify(normalizeJson(left)) === JSON.stringify(normalizeJson(right))
  );
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(normalizeJson(left)) === JSON.stringify(normalizeJson(right))
  );
}

function maxFiniteNumber(left: unknown, right: unknown): unknown {
  const leftNumber =
    typeof left === 'number' && Number.isFinite(left) ? left : null;
  const rightNumber =
    typeof right === 'number' && Number.isFinite(right) ? right : null;
  if (leftNumber === null) {
    return right;
  }
  if (rightNumber === null) {
    return left;
  }
  return Math.max(leftNumber, rightNumber);
}

function maxIsoDate(left: unknown, right: unknown): unknown {
  if (typeof left !== 'string') {
    return right;
  }
  if (typeof right !== 'string') {
    return left;
  }
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (!Number.isFinite(leftTime)) {
    return right;
  }
  if (!Number.isFinite(rightTime)) {
    return left;
  }
  return leftTime >= rightTime ? left : right;
}

function mergeCreationMeta(
  current: SerializedRecord,
  intended: SerializedRecord,
): SerializedRecord {
  const merged = { ...intended, ...current };
  for (const key of ['lastAddedAt', 'lastTreeOpenedAt']) {
    merged[key] = maxIsoDate(current[key], intended[key]);
  }
  for (const key of ['treeOpenStreak', 'currentRunNumber']) {
    merged[key] = maxFiniteNumber(current[key], intended[key]);
  }
  return merged;
}

function mergeArchiveEntryForward(
  current: SerializedRecord | undefined,
  before: SerializedRecord | undefined,
  intended: SerializedRecord,
): SerializedRecord {
  if (!current) {
    return intended;
  }

  const merged: SerializedRecord = {};
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(intended),
    ...Object.keys(current),
  ]);
  for (const key of keys) {
    const currentValue = current[key];
    const beforeValue = before?.[key];
    merged[key] = valuesEqual(currentValue, beforeValue)
      ? intended[key]
      : currentValue;
  }
  for (const key of [
    'cumulativeExecutionDays',
    'internalizationProgress',
    'timesUsed',
  ]) {
    merged[key] = maxFiniteNumber(current[key], intended[key]);
  }
  merged.lastActiveAt = maxIsoDate(current.lastActiveAt, intended.lastActiveAt);
  return merged;
}

function rollbackRecord(
  current: SerializedRecord,
  before: SerializedRecord | undefined,
  after: SerializedRecord,
): SerializedRecord | undefined {
  if (recordsEqual(current, after)) {
    return before;
  }

  const rolledBack: SerializedRecord = {};
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after),
    ...Object.keys(current),
  ]);
  for (const key of keys) {
    if (valuesEqual(current[key], after[key])) {
      if (before && key in before) {
        rolledBack[key] = before[key];
      }
    } else if (key in current) {
      rolledBack[key] = current[key];
    }
  }
  return Object.keys(rolledBack).length > 0 ? rolledBack : undefined;
}

function findRecordById(
  records: SerializedRecord[],
  id: string,
): SerializedRecord | undefined {
  return records.find((record) => recordId(record) === id);
}

function replaceRecordsById(
  current: SerializedRecord[],
  replacements: SerializedRecord[],
): SerializedRecord[] {
  const replacementsById = new Map(
    replacements.map((value) => [recordId(value), value]),
  );
  const currentIds = new Set(current.map(recordId));
  return [
    ...current.map((value) => replacementsById.get(recordId(value)) ?? value),
    ...replacements.filter((value) => !currentIds.has(recordId(value))),
  ];
}

class HiddenRSIPDescendantError extends Error {
  constructor(readonly hiddenIds: string[]) {
    super(
      `RSIP archive discovered unjournaled descendants: ${hiddenIds.join(', ')}`,
    );
    this.name = 'HiddenRSIPDescendantError';
  }
}

function findUnjournaledDescendants(
  nodes: SerializedRecord[],
  archivedIds: Set<string>,
): string[] {
  const discovered = new Set(archivedIds);
  const hidden: string[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      const id = recordId(node);
      if (discovered.has(id) || typeof node.parentId !== 'string') {
        continue;
      }
      if (discovered.has(node.parentId)) {
        discovered.add(id);
        hidden.push(id);
        changed = true;
      }
    }
  }
  return hidden;
}

function restoreMissingIndexedRecords(
  current: SerializedRecord[],
  snapshots: IndexedRSIPSnapshot[],
): SerializedRecord[] {
  const restored = [...current];
  const currentIds = new Set(current.map(recordId));
  for (const snapshot of [...snapshots].sort(
    (left, right) => left.index - right.index,
  )) {
    if (currentIds.has(recordId(snapshot.value))) {
      continue;
    }
    restored.splice(
      Math.min(snapshot.index, restored.length),
      0,
      snapshot.value,
    );
    currentIds.add(recordId(snapshot.value));
  }
  return restored;
}

function applyCreation(journal: CreateNodesWithMetaIntent): void {
  if (journal.nodesToAdd.length > 0) {
    const nodes = readStoredRecords(STORAGE_KEYS.RSIP_NODES);
    const existingIds = new Set(nodes.map(recordId));
    const nextNodes = [
      ...nodes,
      ...journal.nodesToAdd.filter((node) => !existingIds.has(recordId(node))),
    ].sort(
      (left, right) =>
        Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0),
    );
    localStorage.setItem(STORAGE_KEYS.RSIP_NODES, JSON.stringify(nextNodes));
  }
  const currentMetaRaw = localStorage.getItem(STORAGE_KEYS.RSIP_META);
  const currentMetaValue = currentMetaRaw
    ? (JSON.parse(currentMetaRaw) as unknown)
    : {};
  if (!isRecord(currentMetaValue)) {
    throw new Error('Invalid RSIP metadata during atomic recovery');
  }
  localStorage.setItem(
    STORAGE_KEYS.RSIP_META,
    JSON.stringify(mergeCreationMeta(currentMetaValue, journal.nextMeta)),
  );
}

function rollbackCreation(journal: CreateNodesWithMetaIntent): void {
  if (journal.nodesToAdd.length > 0) {
    const intendedById = new Map(
      journal.nodesToAdd.map((node) => [recordId(node), node]),
    );
    const nodes = readStoredRecords(STORAGE_KEYS.RSIP_NODES).filter((node) => {
      const intended = intendedById.get(recordId(node));
      return !intended || !recordsEqual(node, intended);
    });
    localStorage.setItem(STORAGE_KEYS.RSIP_NODES, JSON.stringify(nodes));
  }
  const currentMetaRaw = localStorage.getItem(STORAGE_KEYS.RSIP_META);
  if (currentMetaRaw) {
    const currentMetaValue = JSON.parse(currentMetaRaw) as unknown;
    if (!isRecord(currentMetaValue)) {
      throw new Error('Invalid RSIP metadata during atomic rollback');
    }
    const rolledBack = rollbackRecord(
      currentMetaValue,
      journal.previousMeta ?? undefined,
      journal.nextMeta,
    );
    if (rolledBack) {
      localStorage.setItem(STORAGE_KEYS.RSIP_META, JSON.stringify(rolledBack));
    } else {
      localStorage.removeItem(STORAGE_KEYS.RSIP_META);
    }
  }
}

function applyArchive(journal: ArchiveNodesIntent): void {
  const archivedIds = new Set(
    journal.removedNodes.map(({ value }) => recordId(value)),
  );
  const nodes = readStoredRecords(STORAGE_KEYS.RSIP_NODES);
  const hiddenIds = findUnjournaledDescendants(nodes, archivedIds);
  if (hiddenIds.length > 0) {
    throw new HiddenRSIPDescendantError(hiddenIds);
  }
  const currentLibrary = readStoredRecords(STORAGE_KEYS.RSIP_POLICY_LIBRARY);
  const previousById = new Map(
    journal.previousEntries.map(({ value }) => [recordId(value), value]),
  );
  const mergedEntries = journal.nextEntries.map((entry) => {
    const id = recordId(entry);
    return mergeArchiveEntryForward(
      findRecordById(currentLibrary, id),
      previousById.get(id),
      entry,
    );
  });
  const library = replaceRecordsById(currentLibrary, mergedEntries);
  localStorage.setItem(
    STORAGE_KEYS.RSIP_POLICY_LIBRARY,
    JSON.stringify(library),
  );

  const remainingNodes = nodes.filter(
    (node) => !archivedIds.has(recordId(node)),
  );
  localStorage.setItem(STORAGE_KEYS.RSIP_NODES, JSON.stringify(remainingNodes));
}

function rollbackArchive(journal: ArchiveNodesIntent): void {
  const archivedIds = new Set(
    journal.removedNodes.map(({ value }) => recordId(value)),
  );
  const currentLibrary = readStoredRecords(STORAGE_KEYS.RSIP_POLICY_LIBRARY);
  const previousById = new Map(
    journal.previousEntries.map(({ value }) => [recordId(value), value]),
  );
  const nextById = new Map(
    journal.nextEntries.map((value) => [recordId(value), value]),
  );
  const rolledBackById = new Map<string, SerializedRecord>();
  for (const id of archivedIds) {
    const current = findRecordById(currentLibrary, id);
    const after = nextById.get(id);
    if (!current || !after) {
      continue;
    }
    const rolledBack = rollbackRecord(current, previousById.get(id), after);
    if (rolledBack) {
      rolledBackById.set(id, rolledBack);
    }
  }
  const library = currentLibrary.flatMap((entry) => {
    const id = recordId(entry);
    if (!archivedIds.has(id)) {
      return [entry];
    }
    const rolledBack = rolledBackById.get(id);
    return rolledBack ? [rolledBack] : [];
  });
  localStorage.setItem(
    STORAGE_KEYS.RSIP_POLICY_LIBRARY,
    JSON.stringify(library),
  );

  const nodes = restoreMissingIndexedRecords(
    readStoredRecords(STORAGE_KEYS.RSIP_NODES),
    journal.removedNodes,
  );
  localStorage.setItem(STORAGE_KEYS.RSIP_NODES, JSON.stringify(nodes));
}

function applyJournal(journal: RSIPAtomicJournal): void {
  if (journal.kind === 'create_nodes_with_meta') {
    applyCreation(journal);
  } else {
    applyArchive(journal);
  }
}

function rollbackJournal(journal: RSIPAtomicJournal): void {
  if (journal.kind === 'create_nodes_with_meta') {
    rollbackCreation(journal);
  } else {
    rollbackArchive(journal);
  }
}

function isQuotaExceededError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as { code?: number; name?: string };
  return (
    candidate.name === 'QuotaExceededError' ||
    candidate.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    candidate.code === 22 ||
    candidate.code === 1014
  );
}

function rollbackAndClearJournal(journal: RSIPAtomicJournal): void {
  try {
    rollbackJournal(journal);
  } finally {
    localStorage.removeItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL);
  }
}

export function recoverRSIPAtomicJournal(): void {
  const raw = localStorage.getItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL);
  if (!raw) {
    return;
  }

  const journal = decodeJournal(raw);
  try {
    applyJournal(journal);
    localStorage.removeItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL);
  } catch (error) {
    if (error instanceof HiddenRSIPDescendantError) {
      rollbackAndClearJournal(journal);
      return;
    }
    if (!isQuotaExceededError(error)) {
      throw error;
    }
    rollbackAndClearJournal(journal);
  }
}

export function commitRSIPAtomicJournal(intent: RSIPAtomicIntent): void {
  recoverRSIPAtomicJournal();
  const journal: RSIPAtomicJournal = {
    version: RSIP_JOURNAL_VERSION,
    ...intent,
  };
  localStorage.setItem(
    STORAGE_KEYS.RSIP_ATOMIC_JOURNAL,
    JSON.stringify(journal),
  );
  try {
    applyJournal(journal);
    localStorage.removeItem(STORAGE_KEYS.RSIP_ATOMIC_JOURNAL);
  } catch (error) {
    if (
      error instanceof HiddenRSIPDescendantError ||
      isQuotaExceededError(error)
    ) {
      rollbackAndClearJournal(journal);
    }
    throw error;
  }
}
