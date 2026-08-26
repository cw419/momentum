/**
 * @module useChainsDomain
 * @description 任务链 CRUD 操作的领域 Hook
 *
 * 职责：
 * - 创建、编辑、保存任务链（Chain）
 * - 处理 UnitChain 和 GroupChain 的类型转换
 * - 支持复制链条功能
 *
 * @see docs/guides/ARCHITECTURE.md - 架构总览
 * @see src/types/index.ts - Chain, UnitChain, GroupChain 类型定义
 */
import type { Dispatch, SetStateAction } from 'react';
import type {
  AppState,
  Chain,
  ChainDraft,
  GroupChain,
  UnitChain,
} from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { queryOptimizer } from '../../utils/queryOptimizer';
import { logger } from '../../utils/logger';
import { toast } from '../../utils/toast';
import { useI18n } from '../../i18n';
import { resolveAppStateReader } from './appStateAccess';
import { getSafeErrorDetailFromUnknown } from '../../utils/errorMessage';
import { normalizeUnknownError } from '../../utils/errors/normalizeError';

function normalizeOptionalParentId(parentId: unknown): string | undefined {
  return typeof parentId === 'string' ? parentId : undefined;
}

function updateChainFromDraft(
  existing: Chain,
  chainData: ChainDraft,
  parentId: string | undefined,
): Chain {
  if (chainData.type === 'group') {
    const updated: GroupChain = {
      ...existing,
      ...chainData,
      parentId,
      type: 'group',
    };
    return updated;
  }

  if (existing.type === 'group') {
    const {
      timeLimitHours,
      groupStartedAt,
      groupExpiresAt,
      isTaskGroup,
      groupRepeatCount,
      ...rest
    } = existing;
    const updated: UnitChain = { ...rest, ...chainData, parentId };
    return updated;
  }

  const updated: UnitChain = { ...existing, ...chainData, parentId };
  return updated;
}

function protectActiveSessionFields(
  existing: Chain,
  chainData: ChainDraft,
): ChainDraft {
  return {
    ...existing,
    name: chainData.name,
    trigger: chainData.trigger,
    description: chainData.description,
    auxiliarySignal: chainData.auxiliarySignal,
    auxiliaryDuration: chainData.auxiliaryDuration,
    auxiliaryCompletionTrigger: chainData.auxiliaryCompletionTrigger,
    exceptions: chainData.exceptions,
    auxiliaryExceptions: chainData.auxiliaryExceptions,
    timeLimitExceptions: chainData.timeLimitExceptions,
  } as ChainDraft;
}

function createNewChain(params: {
  chainData: ChainDraft;
  id: string;
  createdAt: Date;
  parentId: string | undefined;
}): Chain {
  const base = {
    id: params.id,
    parentId: params.parentId,
    currentStreak: 0,
    auxiliaryStreak: 0,
    totalCompletions: 0,
    totalFailures: 0,
    auxiliaryFailures: 0,
    createdAt: params.createdAt,
  };

  if (params.chainData.type === 'group') {
    const newChain: GroupChain = {
      ...base,
      ...params.chainData,
      type: 'group',
    };
    return newChain;
  }

  const newChain: UnitChain = { ...base, ...params.chainData };
  return newChain;
}

export type SafelySaveChains = (
  updatedActiveChains: Chain[],
  retryCount?: number,
) => Promise<void>;

interface UseChainsDomainParams {
  state?: AppState;
  getState?: () => AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  editingChainId: string | null;
  storage: MomentumStorage;
  safelySaveChains: SafelySaveChains;
  onNavigateToEditor?: (parentId: string | null, addToToday?: boolean) => void;
  onNewChainCreated?: (chainId: string) => Promise<void>;
  onNavigateToTaskGroupEditor?: () => void;
  onEditChain?: (chain: Chain, isTaskGroup: boolean) => void;
  onNavigateToDashboard?: () => void;
}

export function useChainsDomain({
  state,
  getState,
  setState,
  editingChainId,
  storage,
  safelySaveChains,
  onNavigateToEditor = () => undefined,
  onNewChainCreated = async () => undefined,
  onNavigateToTaskGroupEditor = () => undefined,
  onEditChain = () => undefined,
  onNavigateToDashboard = () => undefined,
}: UseChainsDomainParams) {
  const readState = resolveAppStateReader({ state, getState });
  const { language, tr } = useI18n();
  const handleCreateChain = (parentId?: unknown) => {
    // React event handlers pass the event object as the first argument.
    // If we treat it as a parentId, it can leak `Window` into persisted data and break JSON serialization.
    const normalizedParentId = typeof parentId === 'string' ? parentId : null;

    onNavigateToEditor(normalizedParentId);
  };

  const handleCreateChainForToday = () => {
    onNavigateToEditor(null, true);
  };

  const handleCreateTaskGroup = () => {
    onNavigateToTaskGroupEditor();
  };

  const handleEditChain = (chainId: string) => {
    const chain = readState().chains.find((c) => c.id === chainId);
    if (chain) {
      const isTaskGroup = chain.type === 'group' || Boolean(chain.isTaskGroup);
      onEditChain(chain, isTaskGroup);
    }
  };

  const handleSaveChain = async (
    chainData: ChainDraft,
    isCopy: boolean = false,
  ) => {
    logger.debug('CHAINS', 'Starting to save chain data', {
      chainId: editingChainId,
      chainName: chainData.name,
      chainType: chainData.type,
      isCopy,
      chainCount: readState().chains.length,
    });

    try {
      const allExistingChains = await storage.getChains();
      logger.debug('CHAINS', 'Loaded existing chains (including deleted)', {
        count: allExistingChains.length,
      });

      const activeChains = allExistingChains.filter(
        (chain) => chain.deletedAt == null,
      );
      const deletedChains = allExistingChains.filter(
        (chain) => chain.deletedAt != null,
      );
      logger.debug('CHAINS', 'Chain counts', {
        active: activeChains.length,
        deleted: deletedChains.length,
      });

      let updatedActiveChains: Chain[];
      let createdChainId: string | null = null;
      const normalizedParentId = normalizeOptionalParentId(chainData.parentId);

      if (editingChainId && !isCopy) {
        logger.debug('CHAINS', 'Editing existing chain', {
          chainId: editingChainId,
        });

        const currentState = readState();
        const isEditingActiveSession =
          currentState.activeSession?.chainId === editingChainId;
        updatedActiveChains = currentState.chains.map((chain) => {
          if (chain.id !== editingChainId) return chain;
          const safeDraft = isEditingActiveSession
            ? protectActiveSessionFields(chain, chainData)
            : chainData;
          const safeParentId = isEditingActiveSession
            ? chain.parentId
            : normalizedParentId;
          return updateChainFromDraft(chain, safeDraft, safeParentId);
        });

        logger.debug('CHAINS', 'Edited chain; updated active chains', {
          count: updatedActiveChains.length,
        });
        const editedChain = updatedActiveChains.find(
          (chain) => chain.id === editingChainId,
        );
        logger.debug('CHAINS', 'Edited chain snapshot', {
          chainId: editedChain?.id,
          name: editedChain?.name,
          type: editedChain?.type,
        });
      } else {
        const id = crypto.randomUUID();
        const createdAt = new Date();
        const newChain = createNewChain({
          chainData,
          id,
          createdAt,
          parentId: normalizedParentId,
        });

        logger.debug('CHAINS', isCopy ? 'Copy chain' : 'Create chain', {
          newChainId: newChain.id,
          type: newChain.type === 'group' ? 'group' : 'unit',
        });

        updatedActiveChains = [...readState().chains, newChain];
        createdChainId = newChain.id;
        logger.debug('CHAINS', 'Added chain; updated active chains', {
          count: updatedActiveChains.length,
        });
      }

      logger.debug('CHAINS', 'Saving chains');
      await safelySaveChains(updatedActiveChains);
      queryOptimizer.onDataChange('chains');
      logger.debug('CHAINS', 'Save succeeded; updating UI state');

      setState((prev) => ({
        ...prev,
        chains: updatedActiveChains,
        chainsRevision: prev.chainsRevision + 1,
      }));
      if (createdChainId) {
        try {
          await onNewChainCreated(createdChainId);
        } catch (error) {
          logger.error(
            'CHAINS',
            'Created chain but failed to add it to today’s plan',
            { chainId: createdChainId },
            normalizeUnknownError(error),
          );
          toast.error(
            tr(
              '任务链已创建，但未能加入今日计划。请从“添加任务”中手动加入。',
              'The chain was created but could not be added to today’s plan. Add it manually from Today.',
            ),
          );
        }
      }
      onNavigateToDashboard();
    } catch (error) {
      logger.error(
        'CHAINS',
        'Failed to save chain',
        undefined,
        normalizeUnknownError(error),
      );

      const safeDetail = getSafeErrorDetailFromUnknown(error, language);
      toast.error(
        safeDetail
          ? tr(`保存失败: ${safeDetail}`, `Save failed: ${safeDetail}`)
          : tr(
              '保存失败，请重试（详情见控制台）',
              'Save failed. Check the console for details, then try again.',
            ),
      );

      try {
        const currentChains = await storage.getActiveChains();
        setState((prev) => ({
          ...prev,
          chains: currentChains,
          chainsRevision: prev.chainsRevision + 1,
        }));
      } catch (reloadError) {
        logger.error(
          'CHAINS',
          '重新加载数据也失败了',
          undefined,
          normalizeUnknownError(reloadError),
        );
      }
    }
  };

  const handleCompleteGoalChain = async (chainId: string) => {
    const current = readState();
    const chain = current.chains.find((candidate) => candidate.id === chainId);
    if (!chain || chain.taskDirection !== 'goal') return;
    const pendingToday = current.dailyPlans
      .filter((plan) => !plan.closedAt)
      .flatMap((plan) => plan.items)
      .some((item) => item.chainId === chainId && item.status === 'pending');
    if (pendingToday) {
      toast.error(
        tr(
          '今日任务群中仍有该目标的未完成计划单元，请先完成或移除它们。',
          'This goal still has unfinished units in today’s plan. Complete or remove them first.',
        ),
      );
      return;
    }
    const updatedChains = current.chains.map((candidate) =>
      candidate.id === chainId
        ? { ...candidate, goalCompletedAt: new Date() }
        : candidate,
    );
    await safelySaveChains(updatedChains);
    setState((previous) => ({
      ...previous,
      chains: updatedChains,
      chainsRevision: previous.chainsRevision + 1,
    }));
    onNavigateToDashboard();
  };

  return {
    handleCreateChain,
    handleCreateChainForToday,
    handleCreateTaskGroup,
    handleEditChain,
    handleSaveChain,
    handleCompleteGoalChain,
  };
}
