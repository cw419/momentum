import { useCallback } from 'react';
import type { RSIPNode, RSIPNodeGroup } from '../../../types';
import type { RSIPViewProps } from '../../RSIPView.types';
import type {
  RSIPViewActionSlice,
  RSIPViewStateSlice,
} from './useRSIPViewModel.types';

interface UseRSIPViewCreationActionsParams {
  state: RSIPViewStateSlice;
  props: Pick<
    RSIPViewProps,
    'onSaveMeta' | 'onSaveNodes' | 'onSaveGroups' | 'onCreateGroup'
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
  const { onSaveMeta, onSaveNodes, onSaveGroups, onCreateGroup } = props;

  const handleModeChange = useCallback(
    (mode: 'free' | 'strict') => {
      onSaveMeta({ ...meta, allowMultiplePerDay: mode === 'free' });
    },
    [meta, onSaveMeta],
  );

  const handleRecordTreeOpened = useCallback(() => {
    const now = new Date();
    const today = now.toDateString();
    const lastOpened = meta.lastTreeOpenedAt
      ? new Date(meta.lastTreeOpenedAt).toDateString()
      : null;

    let treeOpenStreak = meta.treeOpenStreak ?? 0;
    if (lastOpened !== today) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      treeOpenStreak =
        lastOpened === yesterday.toDateString() ? treeOpenStreak + 1 : 1;
    }

    onSaveMeta({ ...meta, lastTreeOpenedAt: now, treeOpenStreak });
  }, [meta, onSaveMeta]);

  const handleCreateGroup = useCallback(async () => {
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
    const faultTolerance = Number(toleranceInput ?? '1');
    const emoji =
      window.prompt(
        tr('可选：输入国策组 Emoji', 'Optional: input group emoji'),
        '🧱',
      ) ?? undefined;

    if (onCreateGroup) {
      const group = await onCreateGroup(titleInput.trim(), faultTolerance, emoji);
      setSelectedGroupId(group.id);
      return;
    }

    if (!onSaveGroups) {
      return;
    }

    const nextGroup: RSIPNodeGroup = {
      id: crypto.randomUUID(),
      title: titleInput.trim(),
      faultTolerance: Math.max(0, Math.floor(faultTolerance)),
      emoji,
      createdAt: new Date(),
    };
    onSaveGroups([...groups, nextGroup]);
    setSelectedGroupId(nextGroup.id);
  }, [groups, onCreateGroup, onSaveGroups, setSelectedGroupId, tr]);

  const handleAddSingle = useCallback(() => {
    if (!canAddToday || !title.trim() || !rule.trim()) {
      return;
    }

    const newNode: RSIPNode = {
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
    };
    onSaveNodes([...nodes, newNode]);
    onSaveMeta({ ...meta, lastAddedAt: new Date() });
    setTitle('');
    setRule('');
  }, [
    canAddToday,
    createEmoji,
    createIsPassive,
    createTimerMinutes,
    createType,
    createUseTimer,
    meta,
    nodes,
    onSaveMeta,
    onSaveNodes,
    rule,
    selectedGroupId,
    selectedParentId,
    setRule,
    setTitle,
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

  const handleSubmitSplit = useCallback(() => {
    if (!canAddToday) {
      return;
    }

    const validItems = splitItems.filter(
      (item) => item.title.trim().length > 0 && item.rule.trim().length > 0,
    );
    if (validItems.length === 0) {
      return;
    }

    const baseSort = Math.floor(Date.now() / 1000);
    const createdAt = new Date();
    const newNodes = validItems.map((item, index) => ({
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

    onSaveNodes([...nodes, ...newNodes]);
    onSaveMeta({ ...meta, lastAddedAt: new Date() });
    setSplitItems([]);
    setSplitGoal('');
  }, [
    canAddToday,
    createEmoji,
    createType,
    meta,
    nodes,
    onSaveMeta,
    onSaveNodes,
    selectedGroupId,
    selectedParentId,
    setSplitGoal,
    setSplitItems,
    splitGoal,
    splitItems,
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
