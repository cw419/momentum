import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { realTimeSyncService } from '../../services/RealTimeSyncService';
import { logger } from '../../utils/logger';
import { toast } from '../../utils/toast';
import { useI18n } from '../../i18n';
import { getSafeErrorDetail } from '../../utils/errorMessage';

interface UseRecycleBinDomainParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
}

export function useRecycleBinDomain({ state, setState, storage }: UseRecycleBinDomainParams) {
  const { language, tr } = useI18n();
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
      const safeDetail = error instanceof Error ? getSafeErrorDetail(error.message, language) : null;
      logger.error('RECYCLE_BIN', 'Delete failed', { chainId }, error as Error);
      toast.error(
        safeDetail
          ? tr(`删除失败: ${safeDetail}`, `Delete failed: ${safeDetail}`)
          : tr('删除失败，请重试（详情见控制台）', 'Delete failed. Check the console for details, then try again.')
      );

      try {
        const currentChains = await storage.getActiveChains();
        setState(prev => ({
          ...prev,
          chains: currentChains,
        }));
      } catch {
        toast.warning(
          tr(
            '发生错误后无法恢复状态，建议刷新页面。',
            "Couldn't restore state after the error. Refresh the page to recover."
          )
        );
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
      const safeDetail = error instanceof Error ? getSafeErrorDetail(error.message, language) : null;

      const rawMessage = error instanceof Error ? error.message : '';
      if (rawMessage.includes('Partial restore failure') || rawMessage.includes('failed to restore')) {
        try {
          const currentChains = await storage.getActiveChains();
          setState(prev => ({
            ...prev,
            chains: currentChains,
          }));

          toast.warning(
            tr(
              '部分链条恢复可能失败，请检查回收箱确认结果。',
              'Some chains may have failed to restore. Please check the recycle bin.'
            )
          );
        } catch {
          toast.warning(
            tr('恢复操作遇到问题，请刷新页面查看最新状态。', 'Restore encountered an issue. Refresh to see the latest status.')
          );
        }
        return;
      }

      logger.error('RECYCLE_BIN', 'Restore failed', { chainIds }, error as Error);
      toast.error(
        safeDetail
          ? tr(`恢复失败: ${safeDetail}`, `Restore failed: ${safeDetail}`)
          : tr('恢复失败，请重试（详情见控制台）', 'Restore failed. Check the console for details, then try again.')
      );
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
      const safeDetail = error instanceof Error ? getSafeErrorDetail(error.message, language) : null;
      logger.error('RECYCLE_BIN', 'Permanent delete failed', { chainIds }, error as Error);
      toast.error(
        safeDetail
          ? tr(`永久删除失败: ${safeDetail}`, `Permanent delete failed: ${safeDetail}`)
          : tr('永久删除失败，请重试（详情见控制台）', 'Permanent delete failed. Check the console for details, then try again.')
      );
    }
  };

  return { handleDeleteChain, handleRestoreChains, handlePermanentDeleteChains };
}
