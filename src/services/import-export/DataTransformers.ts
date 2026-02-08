import type {
  Chain,
  CompletionHistory,
  DistributiveOmit,
  RSIPMeta,
  RSIPNode,
} from '../../types';

type ChainDateFields =
  | 'createdAt'
  | 'lastCompletedAt'
  | 'groupStartedAt'
  | 'groupExpiresAt'
  | 'deletedAt';
type ExportedChain = DistributiveOmit<Chain, ChainDateFields> & {
  createdAt: string;
  lastCompletedAt?: string;
  groupStartedAt?: string;
  groupExpiresAt?: string;
  deletedAt?: string | null;
};

type ExportedCompletionHistory = Omit<CompletionHistory, 'completedAt'> & {
  completedAt: string;
};

type ExportedRSIPNode = Omit<RSIPNode, 'createdAt'> & { createdAt: string };
type ExportedRSIPMeta = Omit<RSIPMeta, 'lastAddedAt'> & {
  lastAddedAt?: string;
};

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

function serializeDeletedAt(
  deletedAt: Date | null | undefined,
): string | null | undefined {
  if (deletedAt === null) return null;
  return deletedAt ? deletedAt.toISOString() : undefined;
}

export function toExportedChain(chain: Chain): ExportedChain {
  const {
    createdAt,
    lastCompletedAt,
    groupStartedAt,
    groupExpiresAt,
    deletedAt,
    ...rest
  } = chain;

  return {
    ...rest,
    createdAt: createdAt.toISOString(),
    lastCompletedAt: lastCompletedAt?.toISOString(),
    groupStartedAt: groupStartedAt?.toISOString(),
    groupExpiresAt: groupExpiresAt?.toISOString(),
    deletedAt: serializeDeletedAt(deletedAt),
  };
}

export function toExportedCompletionHistory(
  entry: CompletionHistory,
): ExportedCompletionHistory {
  const { completedAt, ...rest } = entry;

  return {
    ...rest,
    completedAt: completedAt.toISOString(),
  };
}

export function toExportedRSIPNode(node: RSIPNode): ExportedRSIPNode {
  const { createdAt, ...rest } = node;

  return {
    ...rest,
    createdAt: createdAt.toISOString(),
  };
}

export function toExportedRSIPMeta(meta: RSIPMeta): ExportedRSIPMeta {
  const { lastAddedAt, ...rest } = meta;

  return {
    ...rest,
    lastAddedAt: lastAddedAt?.toISOString(),
  };
}
