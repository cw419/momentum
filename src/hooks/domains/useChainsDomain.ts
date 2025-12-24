import type { Dispatch, SetStateAction } from 'react';
import type { AppState, Chain, ChainDraft, GroupChain, UnitChain } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { queryOptimizer } from '../../utils/queryOptimizer';
import { logger } from '../../utils/logger';
import { toast } from '../../utils/toast';
import { useI18n } from '../../i18n';
import { getSafeErrorDetail } from '../../utils/errorMessage';

export type SafelySaveChains = (updatedActiveChains: Chain[], retryCount?: number) => Promise<void>;

interface UseChainsDomainParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  safelySaveChains: SafelySaveChains;
}

export function useChainsDomain({ state, setState, storage, safelySaveChains }: UseChainsDomainParams) {
  const { language, tr } = useI18n();
  const handleCreateChain = (parentId?: string | null) => {
    setState(prev => ({
      ...prev,
      currentView: 'editor',
      editingChain: null,
      viewingChainId: parentId ?? null,
    }));
  };

  const handleCreateTaskGroup = () => {
    setState(prev => ({
      ...prev,
      currentView: 'taskgroup-editor',
      editingChain: null,
    }));
  };

  const handleEditChain = (chainId: string) => {
    const chain = state.chains.find(c => c.id === chainId);
    if (chain) {
      const isTaskGroup = chain.type === 'group' || chain.isTaskGroup;
      setState(prev => ({
        ...prev,
        currentView: isTaskGroup ? 'taskgroup-editor' : 'editor',
        editingChain: chain,
      }));
    }
  };

  const handleSaveChain = async (
    chainData: ChainDraft,
    isCopy: boolean = false
  ) => {
    logger.debug('CHAINS', 'Starting to save chain data', {
      chainId: state.editingChain?.id ?? null,
      chainName: chainData.name,
      chainType: chainData.type,
      isCopy,
      chainCount: state.chains.length,
    });

    try {
      const allExistingChains = await storage.getChains();
      logger.debug('CHAINS', 'Loaded existing chains (including deleted)', { count: allExistingChains.length });

      const activeChains = allExistingChains.filter(chain => chain.deletedAt == null);
      const deletedChains = allExistingChains.filter(chain => chain.deletedAt != null);
      logger.debug('CHAINS', 'Chain counts', { active: activeChains.length, deleted: deletedChains.length });

      let updatedActiveChains: Chain[];

      if (state.editingChain && !isCopy) {
        logger.debug('CHAINS', 'Editing existing chain', { chainId: state.editingChain.id });

        const editingChainId = state.editingChain.id;
        const normalizedParentId = chainData.parentId || undefined;

        updatedActiveChains = state.chains.map(chain => {
          if (chain.id !== editingChainId) return chain;

          if (chainData.type === 'group') {
            if (chain.type === 'group') {
              const updated: GroupChain = { ...chain, ...chainData, parentId: normalizedParentId, type: 'group' };
              return updated;
            }

            const updated: GroupChain = { ...chain, ...chainData, parentId: normalizedParentId, type: 'group' };
            return updated;
          }

          if (chain.type === 'group') {
            const { timeLimitHours, groupStartedAt, groupExpiresAt, isTaskGroup, groupRepeatCount, ...rest } = chain;
            const updated: UnitChain = { ...rest, ...chainData, parentId: normalizedParentId };
            return updated;
          }

          const updated: UnitChain = { ...chain, ...chainData, parentId: normalizedParentId };
          return updated;
        });
        logger.debug('CHAINS', 'Edited chain; updated active chains', { count: updatedActiveChains.length });
        const editedChain = updatedActiveChains.find(c => c.id === state.editingChain!.id);
        logger.debug('CHAINS', 'Edited chain snapshot', {
          chainId: editedChain?.id,
          name: editedChain?.name,
          type: editedChain?.type,
        });
      } else {
        const id = crypto.randomUUID();
        const createdAt = new Date();
        const normalizedParentId = chainData.parentId || undefined;

        if (chainData.type === 'group') {
          const newChain: GroupChain = {
            id,
            ...chainData,
            parentId: normalizedParentId,
            type: 'group',
            currentStreak: 0,
            auxiliaryStreak: 0,
            totalCompletions: 0,
            totalFailures: 0,
            auxiliaryFailures: 0,
            createdAt,
          };

          if (isCopy) {
            logger.debug('CHAINS', 'Copy chain', { newChainId: newChain.id, type: 'group' });
          } else {
            logger.debug('CHAINS', 'Create chain', { newChainId: newChain.id, type: 'group' });
          }

          updatedActiveChains = [...state.chains, newChain];
        } else {
          const newChain: UnitChain = {
            id,
            ...chainData,
            parentId: normalizedParentId,
            currentStreak: 0,
            auxiliaryStreak: 0,
            totalCompletions: 0,
            totalFailures: 0,
            auxiliaryFailures: 0,
            createdAt,
          };

          if (isCopy) {
            logger.debug('CHAINS', 'Copy chain', { newChainId: newChain.id, type: 'unit' });
          } else {
            logger.debug('CHAINS', 'Create chain', { newChainId: newChain.id, type: 'unit' });
          }

          updatedActiveChains = [...state.chains, newChain];
        }
        logger.debug('CHAINS', 'Added chain; updated active chains', { count: updatedActiveChains.length });
      }

      logger.debug('CHAINS', 'Saving chains');
      await safelySaveChains(updatedActiveChains);
      queryOptimizer.onDataChange('chains');
      logger.debug('CHAINS', 'Save succeeded; updating UI state');

      setState(prev => ({
        ...prev,
        chains: updatedActiveChains,
        currentView: 'dashboard',
        editingChain: null,
      }));
    } catch (error) {
      logger.error('CHAINS', 'Failed to save chain', undefined, error as Error);

      const safeDetail = error instanceof Error ? getSafeErrorDetail(error.message, language) : null;
      toast.error(
        safeDetail
          ? tr(`保存失败: ${safeDetail}`, `Save failed: ${safeDetail}`)
          : tr('保存失败，请重试（详情见控制台）', 'Save failed. Check the console for details, then try again.')
      );

      try {
        const currentChains = await storage.getActiveChains();
        setState(prev => ({
          ...prev,
          chains: currentChains,
        }));
      } catch (reloadError) {
        logger.error('CHAINS', '重新加载数据也失败了', undefined, reloadError as Error);
      }
    }
  };

  return {
    handleCreateChain,
    handleCreateTaskGroup,
    handleEditChain,
    handleSaveChain,
  };
}
