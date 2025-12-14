import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { realTimeSyncService } from '../../services/RealTimeSyncService';
import { queryOptimizer } from '../../utils/queryOptimizer';

interface UseRecycleBinDomainParams {
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
  setRecycleBinRefreshTrigger: Dispatch<SetStateAction<number>>;
}

export function useRecycleBinDomain({ setState, storage, setRecycleBinRefreshTrigger }: UseRecycleBinDomainParams) {
  const handleDeleteChain = async (chainId: string) => {
    try {
      console.log(`[APP] Starting delete operation for chain: ${chainId}`);

      const updatedChains = await realTimeSyncService.deleteWithSync(storage, chainId);

      setState(prev => {
        const updatedScheduledSessions = prev.scheduledSessions.filter(session => session.chainId !== chainId);

        const updatedActiveSession = prev.activeSession?.chainId === chainId ? null : prev.activeSession;

        storage.saveScheduledSessions(updatedScheduledSessions);
        if (!updatedActiveSession) {
          storage.saveActiveSession(null);
        }

        return {
          ...prev,
          chains: updatedChains,
          scheduledSessions: updatedScheduledSessions,
          activeSession: updatedActiveSession,
          currentView: updatedActiveSession ? prev.currentView : 'dashboard',
          viewingChainId: prev.viewingChainId === chainId ? null : prev.viewingChainId,
        };
      });

      setRecycleBinRefreshTrigger(prev => prev + 1);

      try {
        console.log('[APP] Forcing comprehensive RecycleBin state refresh after delete...');

        await realTimeSyncService.clearAllCaches(storage);

        await storage.getDeletedChains();

        setTimeout(() => {
          setState(prev => ({
            ...prev,
            chains: [...prev.chains],
          }));
        }, 50);

        console.log('[APP] RecycleBin state refresh completed successfully');
      } catch (refreshError) {
        console.warn('[APP] RecycleBin state refresh warning (delete operation still successful):', refreshError);
      }

      console.log(`[APP] Chain ${chainId} successfully moved to recycle bin with full state synchronization`);
    } catch (error) {
      console.error('[APP] Delete operation failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      alert(`删除失败: ${errorMessage}\n\n请检查网络连接并重试。如果问题持续，请刷新页面。`);

      try {
        console.log('[APP] Attempting state recovery after delete failure...');
        const currentChains = await storage.getActiveChains();
        setState(prev => ({
          ...prev,
          chains: currentChains,
        }));
        console.log('[APP] State recovery completed');
      } catch (recoveryError) {
        console.error('[APP] State recovery also failed:', recoveryError);
        alert('发生错误后无法恢复状态，建议刷新页面。');
      }
    }
  };

  const handleRestoreChains = async (chainIds: string[]) => {
    console.log('[APP] Starting restore operation for chains:', chainIds);

    try {
      console.log('[APP] Calling realTimeSyncService.restoreWithSync...');
      const updatedChains = await realTimeSyncService.restoreWithSync(storage, chainIds);

      console.log('[APP] Restore operation completed, updating UI state immediately...');

      setState(prev => ({
        ...prev,
        chains: updatedChains,
      }));

      console.log('[APP] Forcing complete data refresh after restore...');
      await realTimeSyncService.forceRefresh();

      setTimeout(async () => {
        try {
          const latestChains = await storage.getActiveChains();
          setState(prev => ({
            ...prev,
            chains: latestChains,
          }));
          console.log('[APP] Final state verification completed with', latestChains.length, 'chains');
        } catch (verificationError) {
          console.warn('[APP] State verification failed:', verificationError);
        }
      }, 100);

      console.log(`[APP] Successfully restored ${chainIds.length} chains, UI state updated immediately`);

      try {
        console.log('正在刷新回收箱状态以确保恢复操作后的数据同步...');
        await storage.getDeletedChains();
        console.log('恢复操作后的回收箱状态刷新完成');
      } catch (refreshError) {
        console.warn('恢复操作后刷新回收箱状态时出现警告（不影响恢复操作）:', refreshError);
      }
    } catch (error) {
      console.error('[APP] Restore operation failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (errorMessage.includes('Partial restore failure') || errorMessage.includes('failed to restore')) {
        console.warn('[APP] Some chains may have been restored despite errors, refreshing state...');

        try {
          const currentChains = await storage.getActiveChains();
          setState(prev => ({
            ...prev,
            chains: currentChains,
          }));

          alert('部分链条恢复可能失败，请检查回收箱确认结果。如果问题持续，请刷新页面。');
        } catch (refreshError) {
          console.error('[APP] Failed to refresh state after partial restore failure:', refreshError);
          alert('恢复操作遇到问题，请刷新页面查看最新状态。');
        }
      } else {
        alert(`恢复失败: ${errorMessage}\n\n如果问题持续，请刷新页面重试。`);
      }
    }
  };

  const handlePermanentDeleteChains = async (chainIds: string[]) => {
    try {
      console.log('永久删除链条:', chainIds);

      const updatedChains = await realTimeSyncService.permanentDeleteWithSync(storage, chainIds);

      setState(prev => ({
        ...prev,
        chains: updatedChains,
      }));

      try {
        console.log('正在刷新回收箱状态以确保永久删除操作后的数据同步...');

        queryOptimizer.clearCache();

        if (storage.clearCache && typeof storage.clearCache === 'function') {
          storage.clearCache();
        }

        await storage.getDeletedChains();

        console.log('永久删除操作后的回收箱状态刷新完成');
      } catch (refreshError) {
        console.warn('永久删除操作后刷新回收箱状态时出现警告（不影响删除操作）:', refreshError);
      }

      console.log(`成功永久删除 ${chainIds.length} 条链条，UI状态已更新`);
    } catch (error) {
      console.error('永久删除链条失败:', error);
      alert('永久删除失败，请重试');
    }
  };

  return { handleDeleteChain, handleRestoreChains, handlePermanentDeleteChains };
}
