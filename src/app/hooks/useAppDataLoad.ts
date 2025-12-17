import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { logger } from '../../utils/logger';
import { isDev } from '../../utils/env';
import { isSessionExpired } from '../../utils/time';

interface UseAppDataLoadParams {
  storage: MomentumStorage;
  isInitialized: boolean;
  setState: Dispatch<SetStateAction<AppState>>;
}

export function useAppDataLoad({ storage, isInitialized, setState }: UseAppDataLoadParams) {
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      logger.debug('APP_SHELL', 'Starting data load', { storage: storage.kind });
      setIsLoadingData(true);
      try {
        // 在加载数据前先执行自动清理
        try {
          const cleanedCount = await storage.cleanupExpiredDeletedChains(30);
          if (cleanedCount > 0) {
            logger.info('APP_SHELL', `Auto-cleaned ${cleanedCount} expired deleted chains`);
          }
        } catch (cleanupError) {
          logger.warn('APP_SHELL', 'Auto cleanup failed', undefined, cleanupError as Error);
        }

        const chains = await storage.getActiveChains();

        // 检查并修复循环引用的数据
        const hasCircularReferences = chains.some(chain => chain.parentId === chain.id);
        if (hasCircularReferences) {
          logger.debug('APP_SHELL', 'Detected circular reference data; fixing');
          const fixedChains = chains.map(chain => {
            if (chain.parentId === chain.id) {
              logger.debug('APP_SHELL', `Fixed circular reference for chain ${chain.name}`);
              return { ...chain, parentId: undefined };
            }
            return chain;
          });

          // 将修复后的数据保存回数据库
          await storage.saveChains(fixedChains);
          logger.info('APP_SHELL', 'Circular reference data fix completed and saved');

          // 使用修复后的数据
          setState(prev => ({
            ...prev,
            chains: fixedChains,
            scheduledSessions: [],
            activeSession: null,
            completionHistory: [],
            currentView: 'dashboard',
          }));
          return;
        }

        logger.debug('APP_SHELL', 'Loaded chain data', { count: chains.length });
        logger.debug('APP_SHELL', 'Chain data details', { chains: chains.map(c => ({ id: c.id, name: c.name })) });

        const allScheduledSessions = await storage.getScheduledSessions();
        const scheduledSessions = allScheduledSessions.filter(session => !isSessionExpired(session.expiresAt));
        const activeSession = await storage.getActiveSession();
        const completionHistory = await storage.getCompletionHistory();
        const rsipNodes = await storage.getRSIPNodes();
        const rsipMeta = await storage.getRSIPMeta();
        const taskTimeStats = await storage.getTaskTimeStats();

        // 执行数据迁移以确保历史记录包含用时信息
        storage.migrateCompletionHistoryForTiming();

        // 执行完整的数据迁移（仅在开发环境中记录详细信息）
        if (isDev) {
          try {
            const { dataMigrationManager } = await import('../../utils/dataMigration');
            const migrationResult = await dataMigrationManager.migrateAll();
            if (!migrationResult.success || migrationResult.errors.length > 0) {
              logger.warn('APP_SHELL', 'Data migration completed with warnings', { migrationResult });
            } else {
              logger.info('APP_SHELL', 'Data migration completed successfully');
            }
          } catch (migrationError) {
            logger.warn('APP_SHELL', 'Error occurred during data migration', undefined, migrationError as Error);
          }
        }

        logger.debug('APP_SHELL', 'Setting app state', { chainCount: chains.length });
        setState(prev => ({
          ...prev,
          chains,
          scheduledSessions,
          activeSession,
          completionHistory,
          rsipNodes,
          rsipMeta,
          taskTimeStats,
          currentView: activeSession ? 'focus' : 'dashboard',
        }));

        // Clean up expired sessions
        if (scheduledSessions.length !== allScheduledSessions.length) {
          await storage.saveScheduledSessions(scheduledSessions);
        }
      } catch (error) {
        logger.error('APP_SHELL', 'Failed to load data', undefined, error as Error);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (isInitialized) {
      logger.debug('APP_SHELL', 'Application initialization complete; starting data load');
      loadData();
    } else {
      setIsLoadingData(false);
    }
  }, [storage, isInitialized, setState]);

  return { isLoadingData };
}

