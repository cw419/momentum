import type { Dispatch, SetStateAction } from 'react';
import type { Chain, CompletionHistory, RSIPMeta, RSIPNode } from '../../types';
import type { AppState } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import type { SafelySaveChains } from './useChainsDomain';
import { logger } from '../../utils/logger';
import { queryOptimizer } from '../../utils/queryOptimizer';
import { useI18n } from '../../i18n';

interface ImportChainsOptions {
  history?: CompletionHistory[];
  rsipNodes?: RSIPNode[];
  rsipMeta?: RSIPMeta;
  exceptionRules?: unknown[];
}

interface UseImportExportDomainParams {
  storage: MomentumStorage;
  safelySaveChains: SafelySaveChains;
  setState: Dispatch<SetStateAction<AppState>>;
}

export function useImportExportDomain({ storage, safelySaveChains, setState }: UseImportExportDomainParams) {
  const { tr } = useI18n();
  const handleImportChains = async (importedChains: Chain[], options?: ImportChainsOptions) => {
    logger.info('APP_SHELL', '开始导入数据', { chainCount: importedChains.length, options });

    try {
      if (storage.kind === 'supabase') {
        // CRITICAL FIX: Additional authentication check as a safety net
        logger.debug('APP_SHELL', 'Double-checking authentication state before import operations');
        const isAuth = await storage.isUserAuthenticated();

        if (!isAuth.ok) {
          logger.warn('IMPORT', 'isUserAuthenticated failed', {
            code: isAuth.error.code,
            message: isAuth.error.message,
          });
        }

        if (!isAuth.ok || !isAuth.value) {
          logger.debug('IMPORT', 'Authentication not ready; waiting');
          const authResult = await storage.waitForAuthentication(10000);

          if (!authResult.ok || !authResult.value.isAuthenticated || !authResult.value.user) {
            throw new Error(
              tr(
                '导入时身份验证失败：请确保您已正确登录，然后重试导入操作。',
                'Authentication failed during import. Please make sure you are signed in and try again.'
              )
            );
          }

          logger.debug('IMPORT', 'Authentication confirmed after wait', { userId: authResult.value.user.id });
        }
      }

      logger.debug('APP_SHELL', '准备保存导入的数据到存储');

      // 验证导入的链条数据
      if (!Array.isArray(importedChains) || importedChains.length === 0) {
        throw new Error(tr('没有有效的链条数据可导入', 'No valid chains found to import'));
      }

      // 获取当前最新的链条数据（避免使用可能过期的 state.chains）
      const currentChains = await storage.getChains();
      logger.debug('APP_SHELL', '当前数据库中的链条数量', { count: currentChains.length });
      logger.debug('APP_SHELL', '准备导入的链条数量', { count: importedChains.length });

      // 检查ID冲突（双重保险）
      const existingIds = new Set(currentChains.map(c => c.id));
      const conflictingChains = importedChains.filter(c => existingIds.has(c.id));
      if (conflictingChains.length > 0) {
        logger.error('APP_SHELL', '发现ID冲突的链条', { conflictingIds: conflictingChains.map(c => c.id) });
        throw new Error(
          tr(
            `导入失败：发现${conflictingChains.length}个ID冲突的链条`,
            `Import failed: found ${conflictingChains.length} chains with conflicting IDs`
          )
        );
      }

      // 创建合并后的链条列表（但只保存导入的部分）
      const updatedChains = [...currentChains, ...importedChains];

      // 仅保存合并后的完整链条列表（让 saveChains 处理用户权限）
      await safelySaveChains(updatedChains);
      queryOptimizer.onDataChange('chains');

      // 获取导入的其他数据
      const importedHistory = options?.history || [];
      const importedRsipNodes = options?.rsipNodes || [];
      const importedRsipMeta = options?.rsipMeta;

      // 保存完成历史
      if (Array.isArray(importedHistory) && importedHistory.length > 0) {
        const existing = await storage.getCompletionHistory();
        const merged = [...existing, ...importedHistory];
        await storage.saveCompletionHistory(merged);
      }

      // 保存 RSIP 节点数据
      if (Array.isArray(importedRsipNodes) && importedRsipNodes.length > 0) {
        const existingNodes = await storage.getRSIPNodes();
        const mergedNodes = [...existingNodes, ...importedRsipNodes];
        await storage.saveRSIPNodes(mergedNodes);
      }

      // 保存 RSIP 元数据
      if (importedRsipMeta) {
        const existingMeta = await storage.getRSIPMeta();
        const mergedMeta = { ...existingMeta, ...importedRsipMeta };
        await storage.saveRSIPMeta(mergedMeta);
      }

      logger.info('APP_SHELL', '导入数据保存成功，更新UI状态');

      // 更新状态
      setState(prev => ({
        ...prev,
        chains: updatedChains,
        completionHistory:
          Array.isArray(importedHistory) && importedHistory.length > 0
            ? [...prev.completionHistory, ...importedHistory]
            : prev.completionHistory,
        rsipNodes:
          Array.isArray(importedRsipNodes) && importedRsipNodes.length > 0
            ? [...prev.rsipNodes, ...importedRsipNodes]
            : prev.rsipNodes,
        rsipMeta: importedRsipMeta ? { ...prev.rsipMeta, ...importedRsipMeta } : prev.rsipMeta,
      }));

      logger.info('APP_SHELL', '导入完成，UI状态更新完成');
    } catch (error) {
      // 提供更详细的错误信息
      const errorMessage = error instanceof Error ? error.message : tr('未知错误', 'Unknown error');
      logger.error('IMPORT', 'Failed to import data', { errorMessage }, error instanceof Error ? error : undefined);

      // 如果导入失败，重新加载数据以确保状态一致性
      try {
        const currentChains = await storage.getChains();
        const currentRsipNodes = await storage.getRSIPNodes();
        const currentRsipMeta = await storage.getRSIPMeta();
        setState(prev => ({
          ...prev,
          chains: currentChains,
          rsipNodes: currentRsipNodes,
          rsipMeta: currentRsipMeta,
        }));
      } catch (reloadError) {
        logger.error('IMPORT', 'Reload after import failure also failed', undefined, reloadError as Error);
      }

      throw error instanceof Error ? error : new Error(errorMessage);
    }
  };

  return { handleImportChains };
}
