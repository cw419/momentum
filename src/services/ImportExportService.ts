import type { Chain, CompletionHistory, DistributiveOmit, ExceptionRule, ExceptionRuleType, RSIPMeta, RSIPNode } from '../types';

type ISODateString = string;

type ChainDateFields = 'createdAt' | 'lastCompletedAt' | 'groupStartedAt' | 'groupExpiresAt' | 'deletedAt';
export type ExportedChain = DistributiveOmit<Chain, ChainDateFields> & {
  createdAt: ISODateString;
  lastCompletedAt?: ISODateString;
  groupStartedAt?: ISODateString;
  groupExpiresAt?: ISODateString;
  deletedAt?: ISODateString | null;
};

export type ExportedCompletionHistory = Omit<CompletionHistory, 'completedAt'> & { completedAt: ISODateString };

export type ExportedRSIPNode = Omit<RSIPNode, 'createdAt'> & { createdAt: ISODateString };
export type ExportedRSIPMeta = Omit<RSIPMeta, 'lastAddedAt'> & { lastAddedAt?: ISODateString };

export interface MomentumExportDataV2 {
  version: '2.0';
  exportedAt: ISODateString;
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

export interface ParsedImportData {
  chains: Chain[];
  history: CompletionHistory[];
  rsipNodes: RSIPNode[];
  rsipMeta?: RSIPMeta;
  userPreferences?: unknown;
  exceptionRulesToImport: Array<Pick<ExceptionRule, 'name' | 'type' | 'description'>>;
}

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

function generateId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isExceptionRuleType(value: unknown): value is ExceptionRuleType {
  return value === 'pause_only' || value === 'early_completion_only';
}

export class ImportExportService {
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
        deletedAt: chain.deletedAt ? chain.deletedAt.toISOString() : chain.deletedAt === null ? null : undefined,
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
    const parsed = JSON.parse(json) as unknown;

    if (!isRecord(parsed)) {
      throw new Error(tr('导入数据格式错误：文件内容不是对象。', 'Invalid import format: file content is not an object.'));
    }

    if (!('chains' in parsed) || !Array.isArray(parsed.chains)) {
      throw new Error(tr('导入数据格式错误：未找到有效的链条数据。', 'Invalid import format: no valid chains found'));
    }

    const rawChains = parsed.chains as unknown[];

    const chainEntries = rawChains.map((raw) => {
      const record = isRecord(raw) ? raw : {};
      const sourceId = String(record.id ?? generateId('chain'));
      return { raw: record, sourceId, newId: generateId('chain') };
    });

    const seenIds = new Set<string>();
    for (const entry of chainEntries) {
      if (seenIds.has(entry.sourceId)) {
        throw new Error(tr(`导入数据包包含重复的链条ID: ${entry.sourceId}`, `Import data contains duplicate chain ID: ${entry.sourceId}`));
      }
      seenIds.add(entry.sourceId);
    }

    const idMap = new Map<string, string>(chainEntries.map(e => [e.sourceId, e.newId]));
    const preserveStatistics = Boolean(options.preserveStatistics);
    const preserveTimestamps = Boolean(options.preserveTimestamps);

    const importChains: Chain[] = chainEntries.map(({ raw, newId }) => {
      const rawType = String(raw.type ?? 'unit');
      const type = allowedChainTypes.has(rawType) ? rawType : 'unit';

      const stats = preserveStatistics
        ? {
            currentStreak: toNumber(raw.currentStreak, 0),
            auxiliaryStreak: toNumber(raw.auxiliaryStreak, 0),
            totalCompletions: toNumber(raw.totalCompletions, 0),
            totalFailures: toNumber(raw.totalFailures, 0),
            auxiliaryFailures: toNumber(raw.auxiliaryFailures, 0),
          }
        : {
            currentStreak: 0,
            auxiliaryStreak: 0,
            totalCompletions: 0,
            totalFailures: 0,
            auxiliaryFailures: 0,
          };

      const createdAt = preserveTimestamps && raw.createdAt ? new Date(String(raw.createdAt)) : new Date();
      const lastCompletedAt =
        preserveTimestamps && raw.lastCompletedAt ? new Date(String(raw.lastCompletedAt)) : undefined;

      const sourceParentId = raw.parentId ?? raw.parent_id ?? undefined;
      const parentId =
        sourceParentId != null && idMap.has(String(sourceParentId)) ? idMap.get(String(sourceParentId)) : undefined;

      const common = {
        id: newId,
        name: String(raw.name ?? tr('未命名链条', 'Untitled chain')),
        parentId,
        sortOrder: toNumber(raw.sortOrder ?? raw.sort_order, Math.floor(Date.now() / 1000)),
        trigger: String(raw.trigger ?? ''),
        duration: toNumber(raw.duration, 45),
        description: String(raw.description ?? ''),
        ...stats,
        exceptions: toStringArray(raw.exceptions),
        auxiliaryExceptions: toStringArray(raw.auxiliaryExceptions),
        auxiliarySignal: String(raw.auxiliarySignal ?? ''),
        auxiliaryDuration: toNumber(raw.auxiliaryDuration, 15),
        auxiliaryCompletionTrigger: String(raw.auxiliaryCompletionTrigger ?? ''),
        timeLimitExceptions: toStringArray(raw.timeLimitExceptions ?? raw.time_limit_exceptions),
        isDurationless: Boolean(raw.isDurationless ?? raw.is_durationless ?? false),
        minimumDuration: toOptionalNumber(raw.minimumDuration ?? raw.minimum_duration),
        taskRepeatCount: toOptionalNumber(raw.taskRepeatCount ?? raw.task_repeat_count),
        createdAt,
        lastCompletedAt,
        deletedAt: null as null,
      };

      if (type === 'group') {
        return {
          ...common,
          type: 'group',
          timeLimitHours: toOptionalNumber(raw.timeLimitHours ?? raw.time_limit_hours),
          groupRepeatCount: toOptionalNumber(raw.groupRepeatCount ?? raw.group_repeat_count),
          isTaskGroup: Boolean(raw.isTaskGroup ?? raw.is_task_group ?? false) || undefined,
          groupStartedAt: undefined,
          groupExpiresAt: undefined,
        } as Chain;
      }

      return {
        ...common,
        type: type as Chain['type'],
      } as Chain;
    });

    let importHistory: CompletionHistory[] = [];
    if (options.importCompletionHistory && Array.isArray(parsed.completionHistory)) {
      importHistory = (parsed.completionHistory as unknown[])
        .filter((h): h is Record<string, unknown> => isRecord(h) && 'chainId' in h)
        .map((h): CompletionHistory | null => {
          const mappedChainId = idMap.get(String(h.chainId));
          if (!mappedChainId) return null;

          const duration = Math.max(0, toNumber(h.duration, 0));

          return {
            chainId: mappedChainId,
            completedAt: new Date(String(h.completedAt || Date.now())),
            duration,
            wasSuccessful: Boolean(h.wasSuccessful),
            reasonForFailure: h.reasonForFailure ? String(h.reasonForFailure) : undefined,
            actualDuration: h.actualDuration != null ? Math.max(0, toNumber(h.actualDuration, duration)) : undefined,
            isForwardTimed: Boolean(h.isForwardTimed || false),
            description: h.description ? String(h.description) : undefined,
            notes: h.notes ? String(h.notes) : undefined,
          };
        })
        .filter((h): h is CompletionHistory => Boolean(h));
    }

    let importedRsipNodes: RSIPNode[] = [];
    if (Array.isArray(parsed.rsipNodes)) {
      const existingIds = new Set((existingRsipNodes || []).map(n => n.id));
      const idMapRsip = new Map<string, string>();

      // First pass: assign new IDs to preserve structure and avoid collisions
      for (const raw of parsed.rsipNodes as unknown[]) {
        if (!isRecord(raw)) continue;
        const originalId = typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id : generateId('rsip');

        let nextId = generateId('rsip');
        while (existingIds.has(nextId)) nextId = generateId('rsip');

        idMapRsip.set(originalId, nextId);
        existingIds.add(nextId);
      }

      importedRsipNodes = (parsed.rsipNodes as unknown[])
        .filter(isRecord)
        .map((raw): RSIPNode => {
          const originalId = typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id : generateId('rsip');
          const id = idMapRsip.get(originalId) ?? generateId('rsip');

          const originalParentId = raw.parentId;
          const parentId =
            typeof originalParentId === 'string' && originalParentId.trim().length > 0
              ? (idMapRsip.get(originalParentId) ?? originalParentId)
              : undefined;

          const createdAt = raw.createdAt ? new Date(String(raw.createdAt)) : new Date();

          return {
            id,
            parentId,
            title: String(raw.title ?? tr('未命名国策', 'Untitled policy')),
            rule: String(raw.rule ?? ''),
            sortOrder: toNumber(raw.sortOrder, Math.floor(Date.now() / 1000)),
            createdAt,
            useTimer: raw.useTimer != null ? Boolean(raw.useTimer) : undefined,
            timerMinutes: toOptionalNumber(raw.timerMinutes),
            emoji: typeof raw.emoji === 'string' ? raw.emoji : undefined,
            type: typeof raw.type === 'string' ? raw.type : undefined,
          };
        });
    }

    const rsipMeta = isRecord(parsed.rsipMeta)
      ? ({
          ...(parsed.rsipMeta as Record<string, unknown>),
          lastAddedAt:
            (parsed.rsipMeta as Record<string, unknown>).lastAddedAt != null
              ? new Date(String((parsed.rsipMeta as Record<string, unknown>).lastAddedAt))
              : undefined,
          allowMultiplePerDay:
            typeof (parsed.rsipMeta as Record<string, unknown>).allowMultiplePerDay === 'boolean'
              ? (parsed.rsipMeta as Record<string, unknown>).allowMultiplePerDay
              : undefined,
        } as RSIPMeta)
      : undefined;

    const exceptionRulesToImport: Array<Pick<ExceptionRule, 'name' | 'type' | 'description'>> = [];
    if (isRecord(parsed.exceptionRules) && Array.isArray(parsed.exceptionRules.rules)) {
      for (const raw of parsed.exceptionRules.rules as unknown[]) {
        if (!isRecord(raw)) continue;
        if (!('name' in raw) || !('type' in raw)) continue;
        if (typeof raw.name !== 'string' || !isExceptionRuleType(raw.type)) continue;

        exceptionRulesToImport.push({
          name: raw.name,
          type: raw.type,
          description: typeof raw.description === 'string' ? raw.description : undefined,
        });
      }
    }

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

