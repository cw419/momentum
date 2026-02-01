import type { RSIPMeta, RSIPNode } from '../../../types';
import type { ImportTranslator } from './types';
import {
  getTrimmedNonEmptyString,
  isRecord,
  parseTruthyDateOrNow,
  toNumber,
  toOptionalBoolean,
  toOptionalNumber,
  toOptionalString,
} from './coercions';
import { generateId } from './id';

function buildRsipIdMap(rawNodes: unknown[], existingIds: Set<string>) {
  const idMapRsip = new Map<string, string>();

  for (const raw of rawNodes) {
    if (!isRecord(raw)) continue;

    const originalId = typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id : generateId('rsip');

    let nextId = generateId('rsip');
    while (existingIds.has(nextId)) nextId = generateId('rsip');

    idMapRsip.set(originalId, nextId);
    existingIds.add(nextId);
  }

  return idMapRsip;
}

function getOriginalRsipId(raw: Record<string, unknown>): string {
  return getTrimmedNonEmptyString(raw.id) ?? generateId('rsip');
}

function mapRsipParentId(raw: Record<string, unknown>, idMapRsip: Map<string, string>): string | undefined {
  const originalParentId = getTrimmedNonEmptyString(raw.parentId);
  if (!originalParentId) return undefined;
  return idMapRsip.get(originalParentId) ?? originalParentId;
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

export function parseImportRsipNodes(
  rsipNodes: unknown,
  existingRsipNodes: RSIPNode[] | undefined,
  tr: ImportTranslator
): RSIPNode[] {
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

export function parseImportRsipMeta(rsipMeta: unknown): RSIPMeta | undefined {
  if (!isRecord(rsipMeta)) return undefined;

  return {
    ...rsipMeta,
    lastAddedAt: rsipMeta.lastAddedAt != null ? new Date(String(rsipMeta.lastAddedAt)) : undefined,
    allowMultiplePerDay: typeof rsipMeta.allowMultiplePerDay === 'boolean' ? rsipMeta.allowMultiplePerDay : undefined,
  } as RSIPMeta;
}

