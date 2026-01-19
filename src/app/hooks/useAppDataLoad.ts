import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { logger } from '../../utils/logger';
import { toError } from '../../utils/errorMessage';
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
        if (storage.kind === 'supabase') {
          const authResult = await storage.waitForAuthentication(10000);
          if (!authResult.ok) {
            logger.warn('APP_SHELL', 'Authentication check failed; delaying data load', {
              code: authResult.error.code,
              message: authResult.error.message,
            });
            return;
          }

          if (!authResult.value.isAuthenticated) {
            logger.warn('APP_SHELL', 'Not authenticated; skipping data load');
            return;
          }
        }

        // 在加载数据前先执行自动清理
        const scheduleIdle = (fn: () => void, timeoutMs: number = 2000) => {
          const requestIdleCallbackFn = window.requestIdleCallback;
          if (typeof requestIdleCallbackFn === 'function') {
            requestIdleCallbackFn(() => fn(), { timeout: timeoutMs });
          } else {
            setTimeout(fn, 0);
          }
        };

        // Run maintenance tasks without blocking initial render.
        scheduleIdle(() => {
          void storage
            .cleanupExpiredDeletedChains(30)
            .then(cleanedCount => {
              if (cleanedCount > 0) {
                logger.info('APP_SHELL', `Auto-cleaned ${cleanedCount} expired deleted chains`);
              }
            })
            .catch(cleanupError => {
              logger.warn('APP_SHELL', 'Auto cleanup failed', undefined, toError(cleanupError));
            });
        });

        const [
          chains,
          allScheduledSessions,
          activeSession,
          completionHistory,
          rsipNodes,
          rsipMeta,
          taskTimeStats,
        ] = await Promise.all([
          storage.getActiveChains().catch(error => {
            logger.error('APP_SHELL', 'Failed to load chain data', undefined, toError(error));
            return [];
          }),
          storage.getScheduledSessions().catch(error => {
            logger.warn('APP_SHELL', 'Failed to load scheduled sessions', undefined, toError(error));
            return [];
          }),
          storage.getActiveSession().catch(error => {
            logger.warn('APP_SHELL', 'Failed to load active session', undefined, toError(error));
            return null;
          }),
          storage.getCompletionHistory().catch(error => {
            logger.warn('APP_SHELL', 'Failed to load completion history', undefined, toError(error));
            return [];
          }),
          storage.getRSIPNodes().catch(error => {
            logger.warn('APP_SHELL', 'Failed to load RSIP nodes', undefined, toError(error));
            return [];
          }),
          storage.getRSIPMeta().catch(error => {
            logger.warn('APP_SHELL', 'Failed to load RSIP meta', undefined, toError(error));
            return {};
          }),
          storage.getTaskTimeStats().catch(error => {
            logger.warn('APP_SHELL', 'Failed to load task time stats', undefined, toError(error));
            return [];
          }),
        ]);

        const scheduledSessions = allScheduledSessions.filter(session => !isSessionExpired(session.expiresAt));

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

        // 执行数据迁移以确保历史记录包含用时信息
        storage.migrateCompletionHistoryForTiming();

        // 执行完整的数据迁移（仅在开发环境中记录详细信息）
        if (isDev && storage.kind === 'local') {
          scheduleIdle(() => {
            void import('../../utils/dataMigration')
              .then(({ dataMigrationManager }) => dataMigrationManager.migrateAll())
              .then(migrationResult => {
                if (!migrationResult.success || migrationResult.errors.length > 0) {
                  logger.warn('APP_SHELL', 'Data migration completed with warnings', { migrationResult });
                } else {
                  logger.info('APP_SHELL', 'Data migration completed successfully');
                }
              })
              .catch(migrationError => {
                logger.warn('APP_SHELL', 'Error occurred during data migration', undefined, toError(migrationError));
              });
          }, 5000);
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
        logger.error('APP_SHELL', 'Failed to load data', undefined, toError(error));
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

