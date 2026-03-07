/**
 * @module useImportExportDomain
 * @description 数据导入导出功能的领域 Hook
 *
 * 职责：
 * - 导入链条数据（支持增量合并）
 * - 导入完成历史、RSIP 节点
 * - 处理 ID 冲突检测
 * - Supabase 模式下的身份验证检查
 *
 * 导入时会检查：
 * 1. 数据有效性
 * 2. ID 冲突
 * 3. 用户身份验证（Supabase 模式）
 */
import type { Dispatch, SetStateAction } from 'react';
import type {
  AppState,
  Chain,
  CompletionHistory,
  ExceptionRule,
  RSIPExecutionRecord,
  RSIPLibraryEntry,
  RSIPMeta,
  RSIPNode,
  RSIPNodeGroup,
  RSIPRunRecord,
  RSIPTaskLink,
} from '../../types';
import type { PetState } from '../../types/pet';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { hasStorageCapability } from '../../storage/ports';
import type { SafelySaveChains } from './useChainsDomain';
import { useI18n } from '../../i18n';
import { logger } from '../../utils/logger';
import { queryOptimizer } from '../../utils/queryOptimizer';
import { normalizeUnknownError } from '../../utils/errors/normalizeError';

interface ImportChainsOptions {
  history?: CompletionHistory[];
  rsipNodes?: RSIPNode[];
  rsipMeta?: RSIPMeta;
  rsipGroups?: RSIPNodeGroup[];
  rsipPolicyLibrary?: RSIPLibraryEntry[];
  rsipRunHistory?: RSIPRunRecord[];
  rsipExecutionRecords?: RSIPExecutionRecord[];
  rsipTaskLinks?: RSIPTaskLink[];
  petState?: PetState;
  exceptionRules?: ExceptionRule[];
}

interface UseImportExportDomainParams {
  storage: MomentumStorage;
  safelySaveChains: SafelySaveChains;
  setState: Dispatch<SetStateAction<AppState>>;
}

function appendIfNonEmpty<T>(existing: T[], incoming: T[] | undefined): T[] {
  if (!incoming || incoming.length === 0) return existing;
  return [...existing, ...incoming];
}

export function useImportExportDomain({
  storage,
  safelySaveChains,
  setState,
}: UseImportExportDomainParams) {
  const { tr } = useI18n();
  const canUseAuth = hasStorageCapability(storage, 'auth');

  async function ensureAuthenticatedForImport(): Promise<void> {
    if (!canUseAuth) return;

    logger.debug(
      'APP_SHELL',
      'Double-checking authentication state before import operations',
    );
    const isAuth = await storage.isUserAuthenticated();

    if (!isAuth.ok) {
      logger.warn('IMPORT', 'isUserAuthenticated failed', {
        code: isAuth.error.code,
        message: isAuth.error.message,
      });
    }

    if (isAuth.ok && isAuth.value) return;

    logger.debug('IMPORT', 'Authentication not ready; waiting');
    const authResult = await storage.waitForAuthentication(10000);

    if (
      !authResult.ok ||
      !authResult.value.isAuthenticated ||
      !authResult.value.user
    ) {
      throw new Error(
        tr(
          '导入时身份验证失败：请确保您已正确登录，然后重试导入操作。',
          'Authentication failed during import. Please make sure you are signed in and try again.',
        ),
      );
    }

    logger.debug('IMPORT', 'Authentication confirmed after wait', {
      userId: authResult.value.user.id,
    });
  }

  function assertValidImportedChains(importedChains: Chain[]): void {
    if (!Array.isArray(importedChains) || importedChains.length === 0) {
      throw new Error(
        tr('没有有效的链条数据可导入', 'No valid chains found to import'),
      );
    }
  }

  function assertNoIdConflicts(
    currentChains: Chain[],
    importedChains: Chain[],
  ): void {
    const existingIds = new Set(currentChains.map((chain) => chain.id));
    const conflictingIds = importedChains
      .filter((chain) => existingIds.has(chain.id))
      .map((chain) => chain.id);

    if (conflictingIds.length === 0) return;

    logger.error('IMPORT', 'Detected chain ID conflicts', { conflictingIds });
    throw new Error(
      tr(
        `导入失败：发现 ${conflictingIds.length} 个ID冲突的链条`,
        `Import failed: found ${conflictingIds.length} chains with conflicting IDs`,
      ),
    );
  }

  async function persistImportedHistory(
    history: CompletionHistory[] | undefined,
  ): Promise<void> {
    if (!history || history.length === 0) return;

    if (canUseAuth) {
      await storage.saveCompletionHistory(history);
      return;
    }

    const existing = await storage.getCompletionHistory();
    await storage.saveCompletionHistory([...existing, ...history]);
  }

  async function persistImportedRsipNodes(
    nodes: RSIPNode[] | undefined,
  ): Promise<void> {
    if (!nodes || nodes.length === 0) return;

    const existingNodes = await storage.getRSIPNodes();
    await storage.saveRSIPNodes([...existingNodes, ...nodes]);
  }

  async function persistImportedRsipMeta(
    meta: RSIPMeta | undefined,
  ): Promise<void> {
    if (!meta) return;

    const existingMeta = await storage.getRSIPMeta();
    await storage.saveRSIPMeta({ ...existingMeta, ...meta });
  }

  async function persistImportedRsipGroups(
    groups: RSIPNodeGroup[] | undefined,
  ): Promise<void> {
    if (!groups || groups.length === 0) return;
    const existing = await storage.getRSIPGroups();
    await storage.saveRSIPGroups([...existing, ...groups]);
  }

  async function persistImportedRsipLibrary(
    entries: RSIPLibraryEntry[] | undefined,
  ): Promise<void> {
    if (!entries || entries.length === 0) return;
    const existing = await storage.getRSIPPolicyLibrary();
    await storage.saveRSIPPolicyLibrary([...existing, ...entries]);
  }

  async function persistImportedRsipRunHistory(
    records: RSIPRunRecord[] | undefined,
  ): Promise<void> {
    if (!records || records.length === 0) return;
    const existing = await storage.getRSIPRunHistory();
    await storage.saveRSIPRunHistory([...existing, ...records]);
  }

  async function persistImportedRsipExecutionRecords(
    records: RSIPExecutionRecord[] | undefined,
  ): Promise<void> {
    if (!records || records.length === 0) return;
    for (const record of records) {
      await storage.appendRSIPExecutionRecord(record);
    }
  }

  async function persistImportedRsipTaskLinks(
    links: RSIPTaskLink[] | undefined,
  ): Promise<void> {
    if (!links || links.length === 0) return;
    const existing = await storage.getRSIPTaskLinks();
    await storage.saveRSIPTaskLinks([...existing, ...links]);
  }

  async function persistImportedPetState(
    petState: PetState | undefined,
  ): Promise<void> {
    if (!petState) return;
    await storage.savePetState(petState);
  }

  async function reloadStateAfterImportFailure(): Promise<void> {
    const currentChains = await storage.getChains();
    const currentRsipNodes = await storage.getRSIPNodes();
    const currentRsipMeta = await storage.getRSIPMeta();
    const currentRsipGroups = await storage.getRSIPGroups();
    const currentRsipPolicyLibrary = await storage.getRSIPPolicyLibrary();
    const currentRsipRunHistory = await storage.getRSIPRunHistory();
    const currentRsipTaskLinks = await storage.getRSIPTaskLinks();
    const currentRsipExecutionRecords = await storage.getRSIPExecutionRecords();

    setState((prev) => ({
      ...prev,
      chains: currentChains,
      chainsRevision: prev.chainsRevision + 1,
      rsipNodes: currentRsipNodes,
      rsipMeta: currentRsipMeta,
      rsipGroups: currentRsipGroups,
      rsipPolicyLibrary: currentRsipPolicyLibrary,
      rsipRunHistory: currentRsipRunHistory,
      rsipTaskLinks: currentRsipTaskLinks,
      rsipExecutionRecords: currentRsipExecutionRecords,
    }));
  }

  const handleImportChains = async (
    importedChains: Chain[],
    options?: ImportChainsOptions,
  ) => {
    logger.info('APP_SHELL', '开始导入数据', {
      chainCount: importedChains.length,
      options,
    });

    try {
      await ensureAuthenticatedForImport();
      assertValidImportedChains(importedChains);

      logger.debug('APP_SHELL', '准备保存导入的数据到存储');

      const currentChains = await storage.getChains();
      logger.debug('APP_SHELL', '当前数据库中的链条数量', {
        count: currentChains.length,
      });
      logger.debug('APP_SHELL', '准备导入的链条数量', {
        count: importedChains.length,
      });

      assertNoIdConflicts(currentChains, importedChains);

      const updatedChains = [...currentChains, ...importedChains];
      await safelySaveChains(updatedChains);
      queryOptimizer.onDataChange('chains');

      await persistImportedHistory(options?.history);
      await persistImportedRsipNodes(options?.rsipNodes);
      await persistImportedRsipMeta(options?.rsipMeta);
      await persistImportedRsipGroups(options?.rsipGroups);
      await persistImportedRsipLibrary(options?.rsipPolicyLibrary);
      await persistImportedRsipRunHistory(options?.rsipRunHistory);
      await persistImportedRsipExecutionRecords(options?.rsipExecutionRecords);
      await persistImportedRsipTaskLinks(options?.rsipTaskLinks);
      await persistImportedPetState(options?.petState);

      logger.info('APP_SHELL', '导入数据保存成功，更新 UI 状态');

      setState((prev) => ({
        ...prev,
        chains: updatedChains,
        chainsRevision: prev.chainsRevision + 1,
        completionHistory: appendIfNonEmpty(
          prev.completionHistory,
          options?.history,
        ),
        rsipNodes: appendIfNonEmpty(prev.rsipNodes, options?.rsipNodes),
        rsipMeta: options?.rsipMeta
          ? { ...prev.rsipMeta, ...options.rsipMeta }
          : prev.rsipMeta,
        rsipGroups: appendIfNonEmpty(
          prev.rsipGroups ?? [],
          options?.rsipGroups,
        ),
        rsipPolicyLibrary: appendIfNonEmpty(
          prev.rsipPolicyLibrary ?? [],
          options?.rsipPolicyLibrary,
        ),
        rsipRunHistory: appendIfNonEmpty(
          prev.rsipRunHistory ?? [],
          options?.rsipRunHistory,
        ),
        rsipExecutionRecords: appendIfNonEmpty(
          prev.rsipExecutionRecords ?? [],
          options?.rsipExecutionRecords,
        ),
        rsipTaskLinks: appendIfNonEmpty(
          prev.rsipTaskLinks ?? [],
          options?.rsipTaskLinks,
        ),
      }));

      logger.info('APP_SHELL', '导入完成，UI 状态更新完成');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : tr('未知错误', 'Unknown error');
      logger.error(
        'IMPORT',
        'Failed to import data',
        { errorMessage },
        error instanceof Error ? error : undefined,
      );

      try {
        await reloadStateAfterImportFailure();
      } catch (reloadError) {
        logger.error(
          'IMPORT',
          'Reload after import failure also failed',
          undefined,
          normalizeUnknownError(reloadError),
        );
      }

      throw error instanceof Error ? error : new Error(errorMessage);
    }
  };

  return { handleImportChains };
}
