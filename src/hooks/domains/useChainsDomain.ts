import type { Dispatch, SetStateAction } from 'react';
import type { AppState, Chain, ChainDraft, GroupChain, UnitChain } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { queryOptimizer } from '../../utils/queryOptimizer';

export type SafelySaveChains = (updatedActiveChains: Chain[], retryCount?: number) => Promise<void>;

interface UseChainsDomainParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  safelySaveChains: SafelySaveChains;
}

export function useChainsDomain({ state, setState, storage, safelySaveChains }: UseChainsDomainParams) {
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
    console.log('Starting to save chain data...', chainData);
    console.log('Currently editing chain:', state.editingChain);
    console.log('Is Copy Mode:', isCopy);
    console.log(
      '当前所有链条:',
      state.chains.map(c => ({ id: c.id, name: c.name }))
    );

    try {
      const allExistingChains = await storage.getChains();
      console.log('获取到所有现有链条（包括已删除的）:', allExistingChains.length);

      const activeChains = allExistingChains.filter(chain => chain.deletedAt == null);
      const deletedChains = allExistingChains.filter(chain => chain.deletedAt != null);
      console.log('活跃链条数量:', activeChains.length, '已删除链条数量:', deletedChains.length);

      let updatedActiveChains: Chain[];

      if (state.editingChain && !isCopy) {
        console.log('编辑模式 - 原始链条数据:', state.editingChain);
        console.log('新的链条数据:', chainData);

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
        console.log('编辑现有链，更新后的活跃链数组长度:', updatedActiveChains.length);
        const editedChain = updatedActiveChains.find(c => c.id === state.editingChain!.id);
        console.log('编辑后的链数据:', editedChain);
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
            console.log('复制链条:', newChain);
          } else {
            console.log('创建新链:', newChain);
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
            console.log('复制链条:', newChain);
          } else {
            console.log('创建新链:', newChain);
          }

          updatedActiveChains = [...state.chains, newChain];
        }
        console.log('添加新链后的活跃链数组长度:', updatedActiveChains.length);
      }

      console.log('准备安全保存到存储（包含回收箱数据）...');
      await safelySaveChains(updatedActiveChains);
      queryOptimizer.onDataChange('chains');
      console.log('数据保存成功（包含回收箱数据），更新UI状态');

      setState(prev => ({
        ...prev,
        chains: updatedActiveChains,
        currentView: 'dashboard',
        editingChain: null,
      }));
      console.log('UI状态更新完成');
    } catch (error) {
      console.error('Failed to save chain:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`保存失败: ${errorMessage}\n\n请查看控制台了解详细信息，然后重试`);

      try {
        const currentChains = await storage.getActiveChains();
        setState(prev => ({
          ...prev,
          chains: currentChains,
        }));
      } catch (reloadError) {
        console.error('重新加载数据也失败了:', reloadError);
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
