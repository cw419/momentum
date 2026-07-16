import { useCallback, useEffect, useRef } from 'react';
import type { RSIPMeta, RSIPNode } from '../../../types';
import { toError } from '../../../utils/errorHandling';
import { logger } from '../../../utils/logger';
import {
  getEffectiveRSIPLastAddedAt,
  reconcileRSIPMetaWithNodes,
} from '../../../utils/rsipDailyLimit';

export interface PendingNodeCreation {
  kind: 'single' | 'split';
  signature: string;
  createdNodes: RSIPNode[];
  committed: boolean;
}

interface UseRSIPCreationRecoveryParams {
  meta: RSIPMeta;
  nodes: RSIPNode[];
  isStrictMode: boolean;
  singleDraftSignature: string;
  splitDraftSignature: string;
  enqueueMetaUpdate: (update: (current: RSIPMeta) => RSIPMeta) => Promise<void>;
}

export function mergeCreatedRSIPNodes(
  currentNodes: RSIPNode[],
  createdNodes: RSIPNode[],
): RSIPNode[] {
  const currentIds = new Set(currentNodes.map((node) => node.id));
  return [
    ...currentNodes,
    ...createdNodes.filter((node) => !currentIds.has(node.id)),
  ];
}

export function useRSIPCreationRecovery({
  meta,
  nodes,
  isStrictMode,
  singleDraftSignature,
  splitDraftSignature,
  enqueueMetaUpdate,
}: UseRSIPCreationRecoveryParams) {
  const pendingCreationRef = useRef<PendingNodeCreation | null>(null);
  const committedAdditionAtRef = useRef(
    getEffectiveRSIPLastAddedAt(meta, nodes),
  );
  const latestSingleSignatureRef = useRef(singleDraftSignature);
  const latestSplitSignatureRef = useRef(splitDraftSignature);
  latestSingleSignatureRef.current = singleDraftSignature;
  latestSplitSignatureRef.current = splitDraftSignature;

  useEffect(() => {
    const effectiveLastAddedAt = getEffectiveRSIPLastAddedAt(meta, nodes);
    if (
      effectiveLastAddedAt &&
      (!committedAdditionAtRef.current ||
        effectiveLastAddedAt.getTime() >
          committedAdditionAtRef.current.getTime())
    ) {
      committedAdditionAtRef.current = effectiveLastAddedAt;
    }

    const pending = pendingCreationRef.current;
    if (
      !pending ||
      !pending.createdNodes.every((createdNode) =>
        nodes.some((node) => node.id === createdNode.id),
      )
    ) {
      return;
    }

    pending.committed = true;
    const latestSignature =
      pending.kind === 'single'
        ? latestSingleSignatureRef.current
        : latestSplitSignatureRef.current;
    if (latestSignature !== pending.signature) {
      pendingCreationRef.current = null;
    }
  }, [meta, nodes, singleDraftSignature, splitDraftSignature]);

  const prepareCreation = useCallback(
    (
      kind: PendingNodeCreation['kind'],
      signature: string,
      createNodes: () => RSIPNode[],
    ): PendingNodeCreation => {
      const existing = pendingCreationRef.current;
      if (existing && !existing.committed) {
        return existing;
      }
      if (existing?.kind === kind && existing.signature === signature) {
        return existing;
      }

      const pending: PendingNodeCreation = {
        kind,
        signature,
        createdNodes: createNodes(),
        committed: false,
      };
      pendingCreationRef.current = pending;
      return pending;
    },
    [],
  );

  const markCommitted = useCallback((pending: PendingNodeCreation) => {
    pending.committed = true;
    committedAdditionAtRef.current = pending.createdNodes[0]?.createdAt;
  }, []);

  const isLatestDraft = useCallback((pending: PendingNodeCreation) => {
    return (
      pending.signature ===
      (pending.kind === 'single'
        ? latestSingleSignatureRef.current
        : latestSplitSignatureRef.current)
    );
  }, []);

  const recordCommittedAddition = useCallback(
    async (createdNodes: RSIPNode[]) => {
      try {
        await enqueueMetaUpdate((current) =>
          reconcileRSIPMetaWithNodes(current, createdNodes),
        );
      } catch (error) {
        logger.warn(
          'RSIP',
          'RSIP nodes were committed but addition metadata was not saved',
          { nodeIds: createdNodes.map((node) => node.id) },
          toError(error),
        );
      }
    },
    [enqueueMetaUpdate],
  );

  const hasCommittedStrictAdditionToday = useCallback(() => {
    const committedAt = committedAdditionAtRef.current;
    return (
      isStrictMode && committedAt?.toDateString() === new Date().toDateString()
    );
  }, [isStrictMode]);

  return {
    prepareCreation,
    markCommitted,
    isLatestDraft,
    recordCommittedAddition,
    hasCommittedStrictAdditionToday,
  };
}
