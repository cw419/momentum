import type { Chain, CompletionHistory, DistributiveOmit, RSIPMeta, RSIPNode } from '../../types';

type ChainDateFields = 'createdAt' | 'lastCompletedAt' | 'groupStartedAt' | 'groupExpiresAt' | 'deletedAt';
type ExportedChain = DistributiveOmit<Chain, ChainDateFields> & {
  createdAt: string;
  lastCompletedAt?: string;
  groupStartedAt?: string;
  groupExpiresAt?: string;
  deletedAt?: string | null;
};

type ExportedCompletionHistory = Omit<CompletionHistory, 'completedAt'> & { completedAt: string };

type ExportedRSIPNode = Omit<RSIPNode, 'createdAt'> & { createdAt: string };
type ExportedRSIPMeta = Omit<RSIPMeta, 'lastAddedAt'> & { lastAddedAt?: string };

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

function serializeDeletedAt(deletedAt: Date | null | undefined): string | null | undefined {
  if (deletedAt === null) return null;
  return deletedAt ? deletedAt.toISOString() : undefined;
}

export function toExportedChain(chain: Chain): ExportedChain {
  return {
    ...(chain as unknown as ExportedChain),
    createdAt: chain.createdAt.toISOString(),
    lastCompletedAt: chain.lastCompletedAt?.toISOString(),
    groupStartedAt: chain.groupStartedAt?.toISOString(),
    groupExpiresAt: chain.groupExpiresAt?.toISOString(),
    deletedAt: serializeDeletedAt(chain.deletedAt),
  };
}

export function toExportedCompletionHistory(entry: CompletionHistory): ExportedCompletionHistory {
  return {
    ...(entry as unknown as ExportedCompletionHistory),
    completedAt: entry.completedAt.toISOString(),
  };
}

export function toExportedRSIPNode(node: RSIPNode): ExportedRSIPNode {
  return {
    ...(node as unknown as ExportedRSIPNode),
    createdAt: node.createdAt.toISOString(),
  };
}

export function toExportedRSIPMeta(meta: RSIPMeta): ExportedRSIPMeta {
  return {
    ...(meta as unknown as ExportedRSIPMeta),
    lastAddedAt: meta.lastAddedAt?.toISOString(),
  };
}
