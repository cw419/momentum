import { useCallback, useEffect, useRef } from 'react';
import type { RSIPMeta, RSIPNodeGroup } from '../../../types';
import type { RSIPViewProps } from '../../RSIPView.types';
import type { PendingNodeCreation } from './useRSIPCreationRecovery';
import {
  mergeCreatedRSIPNodes,
  useRSIPCreationRecovery,
} from './useRSIPCreationRecovery';
import type {
  RSIPViewActionSlice,
  RSIPViewStateSlice,
} from './useRSIPViewModel.types';

interface UseRSIPViewCreationActionsParams {
  state: RSIPViewStateSlice;
  props: Pick<
    RSIPViewProps,
    | 'onCreateNodes'
    | 'onSaveMeta'
    | 'onSaveNodes'
    | 'onSaveGroups'
    | 'onCreateGroup'
  >;
}

export function useRSIPViewCreationActions({
  state,
  props,
}: UseRSIPViewCreationActionsParams): Pick<
  RSIPViewActionSlice,
  | 'handleModeChange'
  | 'handleRecordTreeOpened'
  | 'handleCreateGroup'
  | 'handleAddSingle'
  | 'handleApplySplitTemplate'
  | 'handleAddSplitRow'
  | 'handleSubmitSplit'
> {
  const {
    meta,
    groups,
    nodes,
    canAddToday,
    isStrictMode,
    splitTemplates,
    selectedParentId,
    selectedGroupId,
    title,
    rule,
    createUseTimer,
    createTimerMinutes,
    createType,
    createEmoji,
    createIsPassive,
    splitGoal,
    splitItems,
    setSelectedGroupId,
    setTitle,
    setRule,
    setSplitGoal,
    setSplitItems,
    tr,
  } = state;
  const {
    onCreateNodes,
    onSaveMeta,
    onSaveNodes,
    onSaveGroups,
    onCreateGroup,
  } = props;
  const nodeCreationInFlightRef = useRef(false);
  const groupCreationInFlightRef = useRef(false);
  const metaSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestMetaRef = useRef(meta);
  const singleDraftSignature = JSON.stringify({
    title: title.trim(),
    rule: rule.trim(),
    selectedParentId,
    selectedGroupId,
    createUseTimer,
    createTimerMinutes,
    createType,
    createEmoji,
    createIsPassive,
  });
  const splitDraftSignature = JSON.stringify({
    splitGoal: splitGoal.trim(),
    items: splitItems.map((item) => ({
      id: item.id,
      title: item.title.trim(),
      rule: item.rule.trim(),
      isPassive: item.isPassive,
    })),
    selectedParentId,
    selectedGroupId,
    createType,
    createEmoji,
  });
  useEffect(() => {
    latestMetaRef.current = meta;
  }, [meta]);

  const enqueueMetaUpdate = useCallback(
    (update: (current: RSIPMeta) => RSIPMeta) => {
      const queuedSave = metaSaveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const previousMeta = latestMetaRef.current;
          const nextMeta = update(previousMeta);
          latestMetaRef.current = nextMeta;
          try {
            await onSaveMeta(nextMeta);
          } catch (error) {
            if (latestMetaRef.current === nextMeta) {
              latestMetaRef.current = previousMeta;
            }
            throw error;
          }
        });
      metaSaveQueueRef.current = queuedSave;
      return queuedSave;
    },
    [onSaveMeta],
  );

  const handleModeChange = useCallback(
    (mode: 'free' | 'strict') => {
      return enqueueMetaUpdate((current) => ({
        ...current,
        allowMultiplePerDay: mode === 'free',
      }));
    },
    [enqueueMetaUpdate],
  );

  const handleRecordTreeOpened = useCallback(() => {
    const now = new Date();
    const today = now.toDateString();
    return enqueueMetaUpdate((current) => {
      const lastOpened = current.lastTreeOpenedAt
        ? new Date(current.lastTreeOpenedAt).toDateString()
        : null;

      let treeOpenStreak = current.treeOpenStreak ?? 0;
      if (lastOpened !== today) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        treeOpenStreak =
          lastOpened === yesterday.toDateString() ? treeOpenStreak + 1 : 1;
      }

      return { ...current, lastTreeOpenedAt: now, treeOpenStreak };
    });
  }, [enqueueMetaUpdate]);

  const {
    prepareCreation,
    markCommitted,
    isLatestDraft,
    recordCommittedAddition,
    hasCommittedStrictAdditionToday,
  } = useRSIPCreationRecovery({
    meta,
    nodes,
    isStrictMode,
    singleDraftSignature,
    splitDraftSignature,
    enqueueMetaUpdate,
  });

  const persistNodeCreation = useCallback(
    async (pending: PendingNodeCreation) => {
      if (onCreateNodes) {
        await onCreateNodes(
          pending.createdNodes,
          pending.createdNodes[0]?.createdAt ?? new Date(),
        );
      } else {
        await onSaveNodes(mergeCreatedRSIPNodes(nodes, pending.createdNodes));
      }

      markCommitted(pending);
      if (isLatestDraft(pending)) {
        if (pending.kind === 'single') {
          setTitle('');
          setRule('');
        } else {
          setSplitItems([]);
          setSplitGoal('');
        }
      }
      if (!onCreateNodes) {
        await recordCommittedAddition(pending.createdNodes);
      }
    },
    [
      isLatestDraft,
      markCommitted,
      nodes,
      onCreateNodes,
      onSaveNodes,
      recordCommittedAddition,
      setRule,
      setSplitGoal,
      setSplitItems,
      setTitle,
    ],
  );

  const handleCreateGroup = useCallback(async () => {
    if (groupCreationInFlightRef.current) {
      return;
    }
    const titleInput = window.prompt(
      tr('请输入国策组名称', 'Enter policy group name'),
    );
    if (!titleInput?.trim()) {
      return;
    }

    const toleranceInput = window.prompt(
      tr('请输入容错值（整数）', 'Enter fault tolerance (integer)'),
      '1',
    );
    const parsedFaultTolerance = Number(toleranceInput ?? '1');
    const faultTolerance = Number.isFinite(parsedFaultTolerance)
      ? Math.max(0, Math.floor(parsedFaultTolerance))
      : 1;
    const emoji =
      window
        .prompt(
          tr('可选：输入国策组 Emoji', 'Optional: input group emoji'),
          '🧱',
        )
        ?.trim() || undefined;

    if (onCreateGroup) {
      groupCreationInFlightRef.current = true;
      try {
        const group = await onCreateGroup(
          titleInput.trim(),
          faultTolerance,
          emoji,
        );
        setSelectedGroupId(group.id);
      } finally {
        groupCreationInFlightRef.current = false;
      }
      return;
    }

    if (!onSaveGroups) {
      return;
    }

    const nextGroup: RSIPNodeGroup = {
      id: crypto.randomUUID(),
      title: titleInput.trim(),
      faultTolerance,
      emoji,
      createdAt: new Date(),
    };
    groupCreationInFlightRef.current = true;
    try {
      await onSaveGroups([...groups, nextGroup]);
      setSelectedGroupId(nextGroup.id);
    } finally {
      groupCreationInFlightRef.current = false;
    }
  }, [groups, onCreateGroup, onSaveGroups, setSelectedGroupId, tr]);

  const handleAddSingle = useCallback(async () => {
    if (
      !canAddToday ||
      hasCommittedStrictAdditionToday() ||
      !title.trim() ||
      !rule.trim() ||
      nodeCreationInFlightRef.current
    ) {
      return;
    }

    const pending = prepareCreation('single', singleDraftSignature, () => [
      {
        id: crypto.randomUUID(),
        parentId: selectedParentId || undefined,
        groupId: selectedGroupId || undefined,
        title: title.trim(),
        rule: rule.trim(),
        sortOrder: Math.floor(Date.now() / 1000),
        createdAt: new Date(),
        useTimer: createUseTimer,
        timerMinutes: createUseTimer ? createTimerMinutes : undefined,
        type: createType,
        emoji: createEmoji,
        isPassive: createIsPassive,
      },
    ]);
    if (pending.committed) {
      return;
    }

    nodeCreationInFlightRef.current = true;
    try {
      await persistNodeCreation(pending);
    } finally {
      nodeCreationInFlightRef.current = false;
    }
  }, [
    canAddToday,
    createEmoji,
    createIsPassive,
    createTimerMinutes,
    createType,
    createUseTimer,
    hasCommittedStrictAdditionToday,
    persistNodeCreation,
    prepareCreation,
    rule,
    selectedGroupId,
    selectedParentId,
    singleDraftSignature,
    title,
  ]);

  const handleApplySplitTemplate = useCallback(
    (templateKey: string) => {
      const template = splitTemplates[templateKey];
      if (!template) {
        return;
      }

      setSplitGoal(template.goal);
      setSplitItems(
        template.items.map((item) => ({
          ...item,
          id: crypto.randomUUID(),
        })),
      );
    },
    [setSplitGoal, setSplitItems, splitTemplates],
  );

  const handleAddSplitRow = useCallback(() => {
    setSplitItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: '', rule: '', isPassive: false },
    ]);
  }, [setSplitItems]);

  const handleSubmitSplit = useCallback(async () => {
    if (
      !canAddToday ||
      hasCommittedStrictAdditionToday() ||
      nodeCreationInFlightRef.current
    ) {
      return;
    }

    const validItems = splitItems.filter(
      (item) => item.title.trim().length > 0 && item.rule.trim().length > 0,
    );
    if (validItems.length === 0) {
      return;
    }

    const pending = prepareCreation('split', splitDraftSignature, () => {
      const baseSort = Math.floor(Date.now() / 1000);
      const createdAt = new Date();
      return validItems.map((item, index) => ({
        id: crypto.randomUUID(),
        parentId: selectedParentId || undefined,
        groupId: selectedGroupId || undefined,
        title: item.title.trim(),
        rule: item.rule.trim(),
        sortOrder: baseSort + index,
        createdAt,
        type: createType,
        emoji: createEmoji,
        isPassive: item.isPassive,
        splitFromGoal: splitGoal.trim() || undefined,
      }));
    });
    if (pending.committed) {
      return;
    }

    nodeCreationInFlightRef.current = true;
    try {
      await persistNodeCreation(pending);
    } finally {
      nodeCreationInFlightRef.current = false;
    }
  }, [
    canAddToday,
    createEmoji,
    createType,
    hasCommittedStrictAdditionToday,
    persistNodeCreation,
    prepareCreation,
    selectedGroupId,
    selectedParentId,
    splitGoal,
    splitItems,
    splitDraftSignature,
  ]);

  return {
    handleModeChange,
    handleRecordTreeOpened,
    handleCreateGroup,
    handleAddSingle,
    handleApplySplitTemplate,
    handleAddSplitRow,
    handleSubmitSplit,
  };
}
