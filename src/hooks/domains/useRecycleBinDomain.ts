import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { realTimeSyncService } from '../../services/RealTimeSyncService';
import { logger } from '../../utils/logger';
import { toast } from '../../utils/toast';

interface UseRecycleBinDomainParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
}

export function useRecycleBinDomain({ state, setState, storage }: UseRecycleBinDomainParams) {
  const handleDeleteChain = async (chainId: string) => {
    try {
      const updatedChains = await realTimeSyncService.deleteWithSync(storage, chainId);

      const updatedScheduledSessions = state.scheduledSessions.filter(session => session.chainId !== chainId);
      const updatedActiveSession = state.activeSession?.chainId === chainId ? null : state.activeSession;

      void storage.saveScheduledSessions(updatedScheduledSessions).catch(error => {
        logger.error('RECYCLE_BIN', 'Failed to persist scheduled sessions after delete', { chainId }, error as Error);
      });
      if (!updatedActiveSession) {
        void storage.saveActiveSession(null).catch(error => {
          logger.error('RECYCLE_BIN', 'Failed to clear active session after delete', { chainId }, error as Error);
        });
      }

      setState(prev => ({
        ...prev,
        chains: updatedChains,
        scheduledSessions: updatedScheduledSessions,
        activeSession: updatedActiveSession,
        currentView: updatedActiveSession ? prev.currentView : 'dashboard',
        viewingChainId: prev.viewingChainId === chainId ? null : prev.viewingChainId,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('RECYCLE_BIN', 'Delete failed', { chainId }, error as Error);
      toast.error(`删除失败: ${errorMessage}`);

      try {
        const currentChains = await storage.getActiveChains();
        setState(prev => ({
          ...prev,
          chains: currentChains,
        }));
      } catch {
        toast.warning('发生错误后无法恢复状态，建议刷新页面。');
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

          toast.warning('部分链条恢复可能失败，请检查回收箱确认结果。');
        } catch {
          toast.warning('恢复操作遇到问题，请刷新页面查看最新状态。');
        }
        return;
      }

      logger.error('RECYCLE_BIN', 'Restore failed', { chainIds }, error as Error);
      toast.error(`恢复失败: ${errorMessage}`);
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
      logger.error('RECYCLE_BIN', 'Permanent delete failed', { chainIds }, error as Error);
      toast.error(`永久删除失败: ${errorMessage}`);
    }
  };

  return { handleDeleteChain, handleRestoreChains, handlePermanentDeleteChains };
}
