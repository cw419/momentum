import { isMissingSchemaCapabilityError } from './schemaCapabilities';

export const RSIP_NODES_TABLE = 'rsip_nodes';

export type SupabaseLikeError = {
  code?: string;
  message?: string;
};

export function isSchemaMissing(error: SupabaseLikeError): boolean {
  return isMissingSchemaCapabilityError(error);
}
