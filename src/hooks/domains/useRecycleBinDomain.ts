import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { realTimeSyncService } from '../../services/RealTimeSyncService';

interface UseRecycleBinDomainParams {
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
}

export function useRecycleBinDomain({ setState, storage }: UseRecycleBinDomainParams) {
  const handleDeleteChain = async (chainId: string) => {
    try {
      const updatedChains = await realTimeSyncService.deleteWithSync(storage, chainId);

      setState(prev => {
        const updatedScheduledSessions = prev.scheduledSessions.filter(
          session => session.chainId !== chainId
        );
        const updatedActiveSession =
          prev.activeSession?.chainId === chainId ? null : prev.activeSession;

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`删除失败: ${errorMessage}\n\n请检查网络连接并重试。如果问题持续，请刷新页面。`);

      try {
        const currentChains = await storage.getActiveChains();
        setState(prev => ({
          ...prev,
          chains: currentChains,
        }));
      } catch {
        alert('发生错误后无法恢复状态，建议刷新页面。');
      }
    }
  };

  const handleRestoreChains = async (chainIds: string[]) => {
    try {
      const updatedChains = await realTimeSyncService.restoreWithSync(storage, chainIds);

      setState(prev => ({
        ...prev,
        chains: updatedChains,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (errorMessage.includes('Partial restore failure') || errorMessage.includes('failed to restore')) {
        try {
          const currentChains = await storage.getActiveChains();
          setState(prev => ({
            ...prev,
            chains: currentChains,
          }));

          alert('部分链条恢复可能失败，请检查回收箱确认结果。如果问题持续，请刷新页面。');
        } catch {
          alert('恢复操作遇到问题，请刷新页面查看最新状态。');
        }
        return;
      }

      alert(`恢复失败: ${errorMessage}\n\n如果问题持续，请刷新页面重试。`);
    }
  };

  const handlePermanentDeleteChains = async (chainIds: string[]) => {
    try {
      const updatedChains = await realTimeSyncService.permanentDeleteWithSync(storage, chainIds);

      setState(prev => ({
        ...prev,
        chains: updatedChains,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`永久删除失败: ${errorMessage}`);
    }
  };

  return { handleDeleteChain, handleRestoreChains, handlePermanentDeleteChains };
}

