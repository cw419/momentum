import type { RSIPExecutionRecord, RSIPTaskLink } from '../../../types';
import {
  isRecord,
  parseTruthyDateOrNow,
  toOptionalString,
} from '../../../serialization/primitives';
import { generateId } from './id';
import { getStringFromCandidates, parseEnumValue } from './rsipCore';

const EXECUTION_STATUSES: RSIPExecutionRecord['status'][] = [
  'pending',
  'executed',
  'violated',
  'skipped',
];
const CHAIN_KINDS: RSIPTaskLink['chainKind'][] = ['group', 'unit'];
const TRIGGER_EVENTS: RSIPTaskLink['triggerEvent'][] = [
  'task_completed',
  'task_interrupted',
  'group_cycle_completed',
  'rsip_mark_executed',
];
const EFFECTS: RSIPTaskLink['effect'][] = [
  'mark_rsip_executed',
  'mark_rsip_violated',
  'prompt_start_chain',
  'prompt_schedule_chain',
];
const AUTOMATIONS: RSIPTaskLink['automation'][] = ['auto', 'confirm'];

export function parseImportRsipExecutionRecords(
  value: unknown,
  rsipIdMap: Map<string, string>,
): { records: RSIPExecutionRecord[]; skipped: number } {
  if (!Array.isArray(value)) return { records: [], skipped: 0 };
  const records: RSIPExecutionRecord[] = [];
  let skipped = 0;

  for (const raw of value) {
    if (!isRecord(raw)) {
      skipped += 1;
      continue;
    }
    const sourceNodeId = getStringFromCandidates(raw, ['nodeId', 'node_id']);
    const nodeId = sourceNodeId ? rsipIdMap.get(sourceNodeId) : undefined;
    if (!nodeId) {
      skipped += 1;
      continue;
    }
    records.push({
      id: generateId('rsip-exec'),
      nodeId,
      executedAt: parseTruthyDateOrNow(raw.executedAt),
      status:
        parseEnumValue(raw.status, EXECUTION_STATUSES) ?? EXECUTION_STATUSES[0],
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
  value: unknown,
  rsipIdMap: Map<string, string>,
  chainIdMap: Map<string, string>,
): { links: RSIPTaskLink[]; skipped: number } {
  if (!Array.isArray(value)) return { links: [], skipped: 0 };
  const links: RSIPTaskLink[] = [];
  let skipped = 0;

  for (const raw of value) {
    if (!isRecord(raw)) {
      skipped += 1;
      continue;
    }
    const sourceNodeId = getStringFromCandidates(raw, [
      'rsipNodeId',
      'rsip_node_id',
    ]);
    const sourceChainId = getStringFromCandidates(raw, ['chainId', 'chain_id']);
    const rsipNodeId = sourceNodeId ? rsipIdMap.get(sourceNodeId) : undefined;
    const chainId = sourceChainId ? chainIdMap.get(sourceChainId) : undefined;
    if (!rsipNodeId || !chainId) {
      skipped += 1;
      continue;
    }
    links.push({
      id: generateId('rsip-link'),
      rsipNodeId,
      chainId,
      chainKind: parseEnumValue(raw.chainKind, CHAIN_KINDS) ?? CHAIN_KINDS[1],
      triggerEvent:
        parseEnumValue(raw.triggerEvent, TRIGGER_EVENTS) ?? TRIGGER_EVENTS[0],
      effect: parseEnumValue(raw.effect, EFFECTS) ?? EFFECTS[0],
      automation: parseEnumValue(raw.automation, AUTOMATIONS) ?? AUTOMATIONS[1],
      isActive: raw.isActive != null ? Boolean(raw.isActive) : true,
      updatedAt: parseTruthyDateOrNow(raw.updatedAt),
    });
  }
  return { links, skipped };
}
