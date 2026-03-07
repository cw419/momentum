import { useCallback, useMemo, useState } from 'react';
import type { RSIPNode, RSIPTaskLink } from '../../../types';
import { getDescendantCount, getDescendantIds } from '../../../utils/rsipTree';
import { logger } from '../../../utils/logger';
import type { RSIPViewProps } from '../../RSIPView.types';
import {
  getFallbackUpdatedNodesForExecuted,
  getFallbackUpdatedNodesForViolation,
} from '../rsipViewHelpers';
import type {
  RSIPViewActionSlice,
  RSIPViewStateSlice,
} from './useRSIPViewModel.types';

interface UseRSIPViewInteractionActionsParams {
  state: RSIPViewStateSlice;
  props: Pick<
    RSIPViewProps,
    | 'policyLibrary'
    | 'onSaveNodes'
    | 'onSaveTaskLinks'
    | 'onMarkExecuted'
    | 'onMarkViolated'
    | 'onReinforceNode'
    | 'onRestoreFromLibrary'
    | 'onUpsertTaskLinks'
    | 'onGetTaskActions'
    | 'onStartChain'
    | 'onScheduleChain'
  >;
}

export function useRSIPViewInteractionActions({
  state,
  props,
}: UseRSIPViewInteractionActionsParams): Pick<
  RSIPViewActionSlice,
  | 'handleMarkExecuted'
  | 'handleTaskLinkUpsert'
  | 'handleRestoreFromLibrary'
  | 'calculateConstraintPower'
  | 'openViolationDialog'
  | 'violationDialogNode'
  | 'violationDescendants'
  | 'violationGroupMessage'
  | 'handleConfirmViolation'
  | 'closeViolationDialog'
  | 'onSaveNodes'
  | 'onReinforceNode'
> {
  const {
    language,
    nodes,
    groups,
    taskLinks,
    chains,
  } = state;
  const {
    policyLibrary = [],
    onSaveNodes,
    onSaveTaskLinks,
    onMarkExecuted,
    onMarkViolated,
    onReinforceNode,
    onRestoreFromLibrary,
    onUpsertTaskLinks,
    onGetTaskActions,
    onStartChain,
    onScheduleChain,
  } = props;

  const [violationDialogNode, setViolationDialogNode] =
    useState<RSIPNode | null>(null);
  const [violationGroupMessage, setViolationGroupMessage] =
    useState<string>();

  const handleMarkExecuted = useCallback(
    async (nodeId: string, reinforce = false) => {
      let updatedNodes: RSIPNode[];
      if (onMarkExecuted) {
        updatedNodes = await onMarkExecuted(nodeId, nodes, undefined, {
          reinforce,
        });
      } else {
        updatedNodes = getFallbackUpdatedNodesForExecuted(nodes, nodeId);
        onSaveNodes(updatedNodes);
      }

      const linkedActions =
        onGetTaskActions?.(nodeId) ??
        taskLinks.filter(
          (link) =>
            link.rsipNodeId === nodeId &&
            link.triggerEvent === 'rsip_mark_executed' &&
            link.isActive,
        );

      for (const link of linkedActions) {
        const targetChain = chains.find((chain) => chain.id === link.chainId);
        if (!targetChain) {
          logger.warn('RSIP', 'RSIP->task link skipped: missing target chain', {
            linkId: link.id,
            chainId: link.chainId,
          });
          continue;
        }

        if (link.automation !== 'auto') {
          const confirmed = window.confirm(
            language.startsWith('zh')
              ? `国策已执行，是否联动任务「${targetChain.name}」？`
              : `Policy executed. Trigger linked task "${targetChain.name}"?`,
          );
          if (!confirmed) {
            continue;
          }
        }

        if (link.effect === 'prompt_start_chain' && onStartChain) {
          await onStartChain(link.chainId);
        } else if (link.effect === 'prompt_schedule_chain' && onScheduleChain) {
          onScheduleChain(link.chainId);
        }
      }

      return updatedNodes;
    },
    [
      chains,
      language,
      nodes,
      onGetTaskActions,
      onMarkExecuted,
      onSaveNodes,
      onScheduleChain,
      onStartChain,
      taskLinks,
    ],
  );

  const openViolationDialog = useCallback(
    (node: RSIPNode) => {
      setViolationDialogNode(node);
      if (!node.groupId) {
        setViolationGroupMessage(undefined);
        return;
      }

      const group = groups.find((item) => item.id === node.groupId);
      if (!group) {
        setViolationGroupMessage(undefined);
        return;
      }

      const groupNodes = nodes.filter((item) => item.groupId === group.id);
      const survivorsAfterLoss = groupNodes.length - 1;
      const minAlive = Math.max(0, groupNodes.length - group.faultTolerance);

      if (survivorsAfterLoss >= minAlive) {
        setViolationGroupMessage(
          language.startsWith('zh')
            ? `国策组「${group.title}」仍有容错余量，本次违反不会导致整组崩溃。`
            : `Group "${group.title}" still has tolerance remaining. This violation will not collapse the whole group.`,
        );
      } else {
        setViolationGroupMessage(
          language.startsWith('zh')
            ? `国策组「${group.title}」容错已耗尽，本次违反会触发整组崩溃。`
            : `Group "${group.title}" has exhausted tolerance. This violation will collapse the group.`,
        );
      }
    },
    [groups, language, nodes],
  );

  const closeViolationDialog = useCallback(() => {
    setViolationDialogNode(null);
    setViolationGroupMessage(undefined);
  }, []);

  const handleConfirmViolation = useCallback(
    async (payload: { reasonCode?: string; repairHint?: string }) => {
      if (!violationDialogNode) {
        return;
      }

      if (onMarkViolated) {
        await onMarkViolated(violationDialogNode.id, nodes, undefined, {
          reasonCode: payload.reasonCode,
          repairHint: payload.repairHint,
          collapseReason: payload.reasonCode,
        });
      } else {
        onSaveNodes(
          getFallbackUpdatedNodesForViolation(nodes, violationDialogNode.id),
        );
      }

      closeViolationDialog();
    },
    [closeViolationDialog, nodes, onMarkViolated, onSaveNodes, violationDialogNode],
  );

  const handleRestoreFromLibrary = useCallback(
    async (entryId: string, parentId?: string) => {
      if (onRestoreFromLibrary) {
        await onRestoreFromLibrary(entryId, parentId);
        return;
      }

      const entry = policyLibrary.find((item) => item.id === entryId);
      if (!entry) {
        return;
      }

      onSaveNodes([
        ...nodes,
        {
          id: crypto.randomUUID(),
          parentId,
          title: entry.title,
          rule: entry.rule,
          sortOrder: Math.floor(Date.now() / 1000),
          createdAt: new Date(),
          useTimer: entry.useTimer,
          timerMinutes: entry.timerMinutes,
          emoji: entry.emoji,
          type: entry.type,
          isPassive: entry.isPassive,
          cumulativeExecutionDays: entry.cumulativeExecutionDays,
        },
      ]);
    },
    [nodes, onRestoreFromLibrary, onSaveNodes, policyLibrary],
  );

  const handleTaskLinkUpsert = useCallback(
    async (nextLinks: RSIPTaskLink[]) => {
      if (onUpsertTaskLinks) {
        await onUpsertTaskLinks(nextLinks);
        return;
      }
      onSaveTaskLinks?.(nextLinks);
    },
    [onSaveTaskLinks, onUpsertTaskLinks],
  );

  const calculateConstraintPower = useCallback(
    (nodeId: string) => {
      const node = nodes.find((item) => item.id === nodeId);
      if (!node) {
        return { descendantCount: 0, failureCost: 0 };
      }

      const descendantCount = getDescendantCount(nodes, nodeId);
      const phaseWeight = { E0: 1, E1: 2, E2: 3 };
      const weight =
        phaseWeight[(node.stabilityPhase ?? 'E0') as keyof typeof phaseWeight];
      const reinforcementMultiplier =
        (node.reinforcementLevel ?? 0) > 0 ? 0.3 : 1;
      const failureCost =
        Math.round(
          (descendantCount + 1) * weight * reinforcementMultiplier * 100,
        ) / 100;
      return { descendantCount, failureCost };
    },
    [nodes],
  );

  const violationDescendants = useMemo(() => {
    if (!violationDialogNode) {
      return [];
    }

    const descendantIds = new Set(getDescendantIds(nodes, violationDialogNode.id));
    return nodes.filter((node) => descendantIds.has(node.id));
  }, [nodes, violationDialogNode]);

  return {
    handleMarkExecuted,
    handleTaskLinkUpsert,
    handleRestoreFromLibrary,
    calculateConstraintPower,
    openViolationDialog,
    violationDialogNode,
    violationDescendants,
    violationGroupMessage,
    handleConfirmViolation,
    closeViolationDialog,
    onSaveNodes,
    onReinforceNode,
  };
}
