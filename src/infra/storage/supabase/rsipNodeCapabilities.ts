import { isMissingSchemaCapabilityError } from './schemaCapabilities';

export const RSIP_NODES_TABLE = 'rsip_nodes';

export const RSIP_NODE_STRICT_CAPABILITIES = [
  'emoji',
  'type',
  'group_id',
  'reinforcement_level',
  'max_reinforcement_level',
  'cumulative_execution_days',
  'is_passive',
  'split_from_goal',
  'stability_phase',
  'phase_started_at',
  'last_executed_at',
  'last_violated_at',
  'consecutive_executions',
  'consecutive_violations',
  'total_executions',
  'total_violations',
] as const;

export type SupabaseLikeError = {
  code?: string;
  message?: string;
};

export function isSchemaMissing(error: SupabaseLikeError): boolean {
  return isMissingSchemaCapabilityError(error);
}

export function isMissingRSIPNodeStrictColumns(
  error: SupabaseLikeError,
): boolean {
  const message = error.message ?? '';
  return (
    isSchemaMissing(error) ||
    RSIP_NODE_STRICT_CAPABILITIES.some((cap) => message.includes(cap))
  );
}
