import type { Chain, CompletionHistory, DistributiveOmit, ExceptionRule, ExceptionRuleType, RSIPMeta, RSIPNode } from '../types';
import { randomId } from '../utils/random';

type ChainDateFields = 'createdAt' | 'lastCompletedAt' | 'groupStartedAt' | 'groupExpiresAt' | 'deletedAt';
export type ExportedChain = DistributiveOmit<Chain, ChainDateFields> & {
  createdAt: string;
  lastCompletedAt?: string;
  groupStartedAt?: string;
  groupExpiresAt?: string;
  deletedAt?: string | null;
};

export type ExportedCompletionHistory = Omit<CompletionHistory, 'completedAt'> & { completedAt: string };

export type ExportedRSIPNode = Omit<RSIPNode, 'createdAt'> & { createdAt: string };
export type ExportedRSIPMeta = Omit<RSIPMeta, 'lastAddedAt'> & { lastAddedAt?: string };

export interface MomentumExportDataV2 {
  version: '2.0';
  exportedAt: string;
  chains: ExportedChain[];
  completionHistory: ExportedCompletionHistory[];
  rsipNodes?: ExportedRSIPNode[];
  rsipMeta?: ExportedRSIPMeta;
  userPreferences?: unknown;
  exceptionRules?: unknown;
}

export interface ImportExportImportOptions {
  preserveStatistics: boolean;
  preserveTimestamps: boolean;
  importCompletionHistory: boolean;
}

interface ParsedImportData {
  chains: Chain[];
  history: CompletionHistory[];
  rsipNodes: RSIPNode[];
  rsipMeta?: RSIPMeta;
  userPreferences?: unknown;
  exceptionRulesToImport: ExceptionRuleImportData[];
}

type ExceptionRuleImportFields = 'name' | 'type' | 'description';
type ExceptionRuleImportData = Pick<ExceptionRule, ExceptionRuleImportFields>;

const allowedChainTypes = new Set([
  'unit',
  'group',
  'assault',
  'recon',
  'command',
  'special_ops',
  'engineering',
  'quartermaster',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(v => String(v)).filter(v => v.length > 0);
}

function toStringWithDefault(value: unknown, fallback: string): string {
  if (value == null) return fallback;
  return String(value);
}

function toOptionalStringFromTruthy(value: unknown): string | undefined {
  if (!value) return undefined;
  return String(value);
}

function toBooleanWithDefault(value: unknown, fallback: boolean): boolean {
  if (value == null) return fallback;
  return Boolean(value);
}

function toOptionalTruthyBoolean(value: unknown): true | undefined {
  if (!value) return undefined;
  return true;
}

function pickNonNullish(raw: Record<string, unknown>, primaryKey: string, secondaryKey: string): unknown {
  const primaryValue = raw[primaryKey];
  if (primaryValue != null) return primaryValue;

  const secondaryValue = raw[secondaryKey];
  if (secondaryValue != null) return secondaryValue;

  return undefined;
}

function generateId(prefix: string) {
  return randomId(prefix);
}

function isExceptionRuleType(value: unknown): value is ExceptionRuleType {
  return value === 'pause_only' || value === 'early_completion_only';
}

function serializeDeletedAt(deletedAt: Date | null | undefined): string | null | undefined {
  if (deletedAt === null) return null;
  return deletedAt ? deletedAt.toISOString() : undefined;
}

type ImportTranslator = (zh: string, en: string) => string;

type ChainImportEntry = { raw: Record<string, unknown>; sourceId: string; newId: string };

function parseImportPayload(json: string, tr: ImportTranslator): Record<string, unknown> {
  const parsed = JSON.parse(json) as unknown;

  if (!isRecord(parsed)) {
    throw new Error(tr('导入数据格式错误：文件内容不是对象。', 'Invalid import format: file content is not an object.'));
  }

  return parsed;
}

function getRawChainsFromPayload(payload: Record<string, unknown>, tr: ImportTranslator): unknown[] {
  if (!('chains' in payload) || !Array.isArray(payload.chains)) {
    throw new Error(tr('导入数据格式错误：未找到有效的链条数据。', 'Invalid import format: no valid chains found'));
  }

  return payload.chains as unknown[];
}

function buildChainEntriesAndIdMap(rawChains: unknown[], tr: ImportTranslator): {
  chainEntries: ChainImportEntry[];
  idMap: Map<string, string>;
} {
  const chainEntries: ChainImportEntry[] = [];
  const seenIds = new Set<string>();

  for (const raw of rawChains) {
    const record = isRecord(raw) ? raw : {};
    const sourceId = String(record.id ?? generateId('chain'));

    if (seenIds.has(sourceId)) {
      throw new Error(
        tr(
          `导入数据包包含重复的链条ID: ${sourceId}`,
          `Import data contains duplicate chain ID: ${sourceId}`
        )
      );
    }

    seenIds.add(sourceId);
    chainEntries.push({ raw: record, sourceId, newId: generateId('chain') });
  }

  const idMap = new Map<string, string>(chainEntries.map((e) => [e.sourceId, e.newId]));
  return { chainEntries, idMap };
}

function getImportedChainType(raw: Record<string, unknown>): string {
  const rawType = raw.type != null ? String(raw.type) : 'unit';
  return allowedChainTypes.has(rawType) ? rawType : 'unit';
}

function buildImportedChainStats(raw: Record<string, unknown>, preserveStatistics: boolean) {
  if (!preserveStatistics) {
    return {
      currentStreak: 0,
      auxiliaryStreak: 0,
      totalCompletions: 0,
      totalFailures: 0,
      auxiliaryFailures: 0,
    };
  }

  return {
    currentStreak: toNumber(raw.currentStreak, 0),
    auxiliaryStreak: toNumber(raw.auxiliaryStreak, 0),
    totalCompletions: toNumber(raw.totalCompletions, 0),
    totalFailures: toNumber(raw.totalFailures, 0),
    auxiliaryFailures: toNumber(raw.auxiliaryFailures, 0),
  };
}

function parsePreservedDateOrNow(value: unknown, preserveTimestamps: boolean): Date {
  if (!preserveTimestamps) return new Date();
  if (!value) return new Date();
  return new Date(String(value));
}

function parseOptionalPreservedDate(value: unknown, preserveTimestamps: boolean): Date | undefined {
  if (!preserveTimestamps) return undefined;
  if (!value) return undefined;
  return new Date(String(value));
}

function mapImportedChainParentId(raw: Record<string, unknown>, idMap: Map<string, string>): string | undefined {
  const sourceParentId = pickNonNullish(raw, 'parentId', 'parent_id');
  if (sourceParentId == null) return undefined;
  return idMap.get(String(sourceParentId));
}

function buildImportChains(params: {
  chainEntries: ChainImportEntry[];
  idMap: Map<string, string>;
  preserveStatistics: boolean;
  preserveTimestamps: boolean;
  tr: ImportTranslator;
}): Chain[] {
  const { chainEntries, idMap, preserveStatistics, preserveTimestamps, tr } = params;

  return chainEntries.map(({ raw, newId }) => {
    const type = getImportedChainType(raw);
    const stats = buildImportedChainStats(raw, preserveStatistics);

    const createdAt = parsePreservedDateOrNow(raw.createdAt, preserveTimestamps);
    const lastCompletedAt = parseOptionalPreservedDate(raw.lastCompletedAt, preserveTimestamps);
    const parentId = mapImportedChainParentId(raw, idMap);

    const common = {
      id: newId,
      name: String(raw.name ?? tr('未命名链条', 'Untitled chain')),
      parentId,
      sortOrder: toNumber(pickNonNullish(raw, 'sortOrder', 'sort_order'), Math.floor(Date.now() / 1000)),
      trigger: toStringWithDefault(raw.trigger, ''),
      duration: toNumber(raw.duration, 45),
      description: toStringWithDefault(raw.description, ''),
      ...stats,
      exceptions: toStringArray(raw.exceptions),
      auxiliaryExceptions: toStringArray(raw.auxiliaryExceptions),
      auxiliarySignal: toStringWithDefault(raw.auxiliarySignal, ''),
      auxiliaryDuration: toNumber(raw.auxiliaryDuration, 15),
      auxiliaryCompletionTrigger: toStringWithDefault(raw.auxiliaryCompletionTrigger, ''),
      timeLimitExceptions: toStringArray(pickNonNullish(raw, 'timeLimitExceptions', 'time_limit_exceptions')),
      isDurationless: toBooleanWithDefault(pickNonNullish(raw, 'isDurationless', 'is_durationless'), false),
      minimumDuration: toOptionalNumber(pickNonNullish(raw, 'minimumDuration', 'minimum_duration')),
      taskRepeatCount: toOptionalNumber(pickNonNullish(raw, 'taskRepeatCount', 'task_repeat_count')),
      createdAt,
      lastCompletedAt,
      deletedAt: null as null,
    };

    if (type === 'group') {
      return {
        ...common,
        type: 'group',
        timeLimitHours: toOptionalNumber(pickNonNullish(raw, 'timeLimitHours', 'time_limit_hours')),
        groupRepeatCount: toOptionalNumber(pickNonNullish(raw, 'groupRepeatCount', 'group_repeat_count')),
        isTaskGroup: toOptionalTruthyBoolean(pickNonNullish(raw, 'isTaskGroup', 'is_task_group')),
        groupStartedAt: undefined,
        groupExpiresAt: undefined,
      } as Chain;
    }

    return {
      ...common,
      type: type as Chain['type'],
    } as Chain;
  });
}

function mapImportedCompletionHistoryEntry(raw: unknown, idMap: Map<string, string>): CompletionHistory | undefined {
  if (!isRecord(raw)) return undefined;
  if (!('chainId' in raw)) return undefined;

  const mappedChainId = idMap.get(String(raw.chainId));
  if (!mappedChainId) return undefined;

  const duration = Math.max(0, toNumber(raw.duration, 0));

  return {
    chainId: mappedChainId,
    completedAt: parseTruthyDateOrNow(raw.completedAt),
    duration,
    wasSuccessful: Boolean(raw.wasSuccessful),
    reasonForFailure: toOptionalStringFromTruthy(raw.reasonForFailure),
    actualDuration: raw.actualDuration != null ? Math.max(0, toNumber(raw.actualDuration, duration)) : undefined,
    isForwardTimed: Boolean(raw.isForwardTimed),
    description: toOptionalStringFromTruthy(raw.description),
    notes: toOptionalStringFromTruthy(raw.notes),
  };
}

function parseImportHistory(
  completionHistory: unknown,
  shouldImport: boolean,
  idMap: Map<string, string>
): CompletionHistory[] {
  if (!shouldImport) return [];
  if (!Array.isArray(completionHistory)) return [];

  const result: CompletionHistory[] = [];
  for (const raw of completionHistory as unknown[]) {
    const entry = mapImportedCompletionHistoryEntry(raw, idMap);
    if (entry) result.push(entry);
  }

  return result;
}

function buildRsipIdMap(rawNodes: unknown[], existingIds: Set<string>) {
  const idMapRsip = new Map<string, string>();

  for (const raw of rawNodes) {
    if (!isRecord(raw)) continue;

    const originalId =
      typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id : generateId('rsip');

    let nextId = generateId('rsip');
    while (existingIds.has(nextId)) nextId = generateId('rsip');

    idMapRsip.set(originalId, nextId);
    existingIds.add(nextId);
  }

  return idMapRsip;
}

function getTrimmedNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  return value != null ? Boolean(value) : undefined;
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getOriginalRsipId(raw: Record<string, unknown>): string {
  return getTrimmedNonEmptyString(raw.id) ?? generateId('rsip');
}

function mapRsipParentId(raw: Record<string, unknown>, idMapRsip: Map<string, string>): string | undefined {
  const originalParentId = getTrimmedNonEmptyString(raw.parentId);
  if (!originalParentId) return undefined;
  return idMapRsip.get(originalParentId) ?? originalParentId;
}

function parseTruthyDateOrNow(value: unknown): Date {
  return value ? new Date(String(value)) : new Date();
}

function mapImportedRsipNode(raw: Record<string, unknown>, idMapRsip: Map<string, string>, tr: ImportTranslator): RSIPNode {
  const originalId = getOriginalRsipId(raw);
  const id = idMapRsip.get(originalId) ?? generateId('rsip');

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
  };
}

function parseImportRsipNodes(rsipNodes: unknown, existingRsipNodes: RSIPNode[] | undefined, tr: ImportTranslator): RSIPNode[] {
  if (!Array.isArray(rsipNodes)) return [];

  const existingIds = new Set((existingRsipNodes || []).map((n) => n.id));
  const idMapRsip = buildRsipIdMap(rsipNodes as unknown[], existingIds);

  const imported: RSIPNode[] = [];
  for (const raw of rsipNodes as unknown[]) {
    if (!isRecord(raw)) continue;
    imported.push(mapImportedRsipNode(raw, idMapRsip, tr));
  }

  return imported;
}

function parseImportRsipMeta(rsipMeta: unknown): RSIPMeta | undefined {
  if (!isRecord(rsipMeta)) return undefined;

  return {
    ...rsipMeta,
    lastAddedAt: rsipMeta.lastAddedAt != null ? new Date(String(rsipMeta.lastAddedAt)) : undefined,
    allowMultiplePerDay: typeof rsipMeta.allowMultiplePerDay === 'boolean' ? rsipMeta.allowMultiplePerDay : undefined,
  } as RSIPMeta;
}

function parseExceptionRulesToImport(exceptionRules: unknown): ExceptionRuleImportData[] {
  const exceptionRulesToImport: ExceptionRuleImportData[] = [];
  if (!isRecord(exceptionRules) || !Array.isArray(exceptionRules.rules)) return exceptionRulesToImport;

  for (const raw of exceptionRules.rules as unknown[]) {
    if (!isRecord(raw)) continue;
    if (!('name' in raw) || !('type' in raw)) continue;
    if (typeof raw.name !== 'string' || !isExceptionRuleType(raw.type)) continue;

    exceptionRulesToImport.push({
      name: raw.name,
      type: raw.type,
      description: typeof raw.description === 'string' ? raw.description : undefined,
    });
  }

  return exceptionRulesToImport;
}

class ImportExportService {
  createExportData(params: {
    chains: Chain[];
    history?: CompletionHistory[];
    rsipNodes?: RSIPNode[];
    rsipMeta?: RSIPMeta;
    userPreferences?: unknown;
    exceptionRules?: unknown;
  }): MomentumExportDataV2 {
    const { chains, history, rsipNodes, rsipMeta, userPreferences, exceptionRules } = params;

    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      chains: chains.map((chain) => ({
        ...(chain as unknown as ExportedChain),
        createdAt: chain.createdAt.toISOString(),
        lastCompletedAt: chain.lastCompletedAt?.toISOString(),
        groupStartedAt: chain.groupStartedAt?.toISOString(),
        groupExpiresAt: chain.groupExpiresAt?.toISOString(),
        deletedAt: serializeDeletedAt(chain.deletedAt),
      })),
      completionHistory: (history || []).map((h) => ({
        ...(h as unknown as ExportedCompletionHistory),
        completedAt: h.completedAt.toISOString(),
      })),
      rsipNodes: rsipNodes
        ? rsipNodes.map((node) => ({
            ...(node as unknown as ExportedRSIPNode),
            createdAt: node.createdAt.toISOString(),
          }))
        : undefined,
      rsipMeta: rsipMeta
        ? {
            ...(rsipMeta as unknown as ExportedRSIPMeta),
            lastAddedAt: rsipMeta.lastAddedAt?.toISOString(),
          }
        : undefined,
      userPreferences,
      exceptionRules,
    };
  }

  parseImportData(params: {
    json: string;
    options: ImportExportImportOptions;
    existingRsipNodes?: RSIPNode[];
    tr: (zh: string, en: string) => string;
  }): ParsedImportData {
    const { json, options, existingRsipNodes, tr } = params;

    const parsed = parseImportPayload(json, tr);
    const rawChains = getRawChainsFromPayload(parsed, tr);
    const { chainEntries, idMap } = buildChainEntriesAndIdMap(rawChains, tr);

    const importChains = buildImportChains({
      chainEntries,
      idMap,
      preserveStatistics: Boolean(options.preserveStatistics),
      preserveTimestamps: Boolean(options.preserveTimestamps),
      tr,
    });

    const importHistory = parseImportHistory(parsed.completionHistory, Boolean(options.importCompletionHistory), idMap);
    const importedRsipNodes = parseImportRsipNodes(parsed.rsipNodes, existingRsipNodes, tr);
    const rsipMeta = parseImportRsipMeta(parsed.rsipMeta);
    const exceptionRulesToImport = parseExceptionRulesToImport(parsed.exceptionRules);

    return {
      chains: importChains,
      history: importHistory,
      rsipNodes: importedRsipNodes,
      rsipMeta,
      userPreferences: parsed.userPreferences,
      exceptionRulesToImport,
    };
  }
}

export const importExportService = new ImportExportService();
