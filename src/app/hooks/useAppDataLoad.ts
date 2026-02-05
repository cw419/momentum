import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { fireAndForget } from '../../utils/fireAndForget';
import { migrateCompletionHistoryForTiming } from '../../utils/completionHistoryTimingMigration';
import { toError } from '../../utils/errorMessage';
import { isDev } from '../../utils/env';
import { logger } from '../../utils/logger';
import { runWhenIdle } from '../../utils/runWhenIdle';
import { isSessionExpired } from '../../utils/time';

type CompletionHistory = Awaited<ReturnType<MomentumStorage['getCompletionHistory']>>;

async function cleanupExpiredDeletedChains(storage: MomentumStorage): Promise<void> {
  try {
    const cleanedCount = await storage.cleanupExpiredDeletedChains(30);
    if (cleanedCount > 0) {
      logger.info('APP_SHELL', `Auto-cleaned ${cleanedCount} expired deleted chains`);
    }
  } catch (error) {
    logger.warn('APP_SHELL', 'Auto cleanup failed', undefined, toError(error));
  }
}

async function persistCompletionHistoryTimingMigration(
  storage: MomentumStorage,
  completionHistory: CompletionHistory
): Promise<void> {
  try {
    await storage.saveCompletionHistory(completionHistory);
  } catch (error) {
    logger.warn('APP_SHELL', 'Failed to persist completion history timing migration', undefined, toError(error));
  }
}

async function runDevDataMigration(): Promise<void> {
  try {
    const { dataMigrationManager } = await import('../../utils/dataMigration');
    const migrationResult = await dataMigrationManager.migrateAll();

    if (!migrationResult.success || migrationResult.errors.length > 0) {
      logger.warn('APP_SHELL', 'Data migration completed with warnings', { migrationResult });
      return;
    }

    logger.info('APP_SHELL', 'Data migration completed successfully');
  } catch (error) {
    logger.warn('APP_SHELL', 'Error occurred during data migration', undefined, toError(error));
  }
}

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

        // Run maintenance tasks without blocking initial render.
        runWhenIdle(() => {
          fireAndForget(cleanupExpiredDeletedChains(storage), { label: 'APP_SHELL auto cleanup' });
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
          storage.getActiveChains().catch((error) => {
            logger.error('APP_SHELL', 'Failed to load chain data', undefined, toError(error));
            return [];
          }),
          storage.getScheduledSessions().catch((error) => {
            logger.warn('APP_SHELL', 'Failed to load scheduled sessions', undefined, toError(error));
            return [];
          }),
          storage.getActiveSession().catch((error) => {
            logger.warn('APP_SHELL', 'Failed to load active session', undefined, toError(error));
            return null;
          }),
          storage.getCompletionHistory().catch((error) => {
            logger.warn('APP_SHELL', 'Failed to load completion history', undefined, toError(error));
            return [];
          }),
          storage.getRSIPNodes().catch((error) => {
            logger.warn('APP_SHELL', 'Failed to load RSIP nodes', undefined, toError(error));
            return [];
          }),
          storage.getRSIPMeta().catch((error) => {
            logger.warn('APP_SHELL', 'Failed to load RSIP meta', undefined, toError(error));
            return {};
          }),
          storage.getTaskTimeStats().catch((error) => {
            logger.warn('APP_SHELL', 'Failed to load task time stats', undefined, toError(error));
            return [];
          }),
        ]);

        const scheduledSessions = allScheduledSessions.filter((session) => !isSessionExpired(session.expiresAt));

        // Check and fix circular reference data.
        const hasCircularReferences = chains.some((chain) => chain.parentId === chain.id);
        if (hasCircularReferences) {
          logger.debug('APP_SHELL', 'Detected circular reference data; fixing');
          const fixedChains = chains.map((chain) => {
            if (chain.parentId === chain.id) {
              logger.debug('APP_SHELL', `Fixed circular reference for chain ${chain.name}`);
              return { ...chain, parentId: undefined };
            }
            return chain;
          });

          // Persist the fixed data before continuing.
          await storage.saveChains(fixedChains);
          logger.info('APP_SHELL', 'Circular reference data fix completed and saved');

          setState((prev) => ({
            ...prev,
            chains: fixedChains,
            chainsRevision: prev.chainsRevision + 1,
            scheduledSessions: [],
            activeSession: null,
            completionHistory: [],
            currentView: 'dashboard',
          }));
          return;
        }

        logger.debug('APP_SHELL', 'Loaded chain data', { count: chains.length });
        logger.debug('APP_SHELL', 'Chain data details', { chains: chains.map((c) => ({ id: c.id, name: c.name })) });

        // Migrate completion history to include timing info.
        const { updatedHistory: migratedCompletionHistory, hasChanges: didMigrateCompletionHistory } =
          migrateCompletionHistoryForTiming(completionHistory, chains);
        if (didMigrateCompletionHistory) {
          runWhenIdle(() => {
            fireAndForget(persistCompletionHistoryTimingMigration(storage, migratedCompletionHistory), {
              label: 'APP_SHELL completion history timing migration',
            });
          });
        }

        // Run full data migration (dev-only) to validate data.
        if (isDev && storage.kind === 'local') {
          runWhenIdle(() => {
            fireAndForget(runDevDataMigration(), { label: 'APP_SHELL data migration' });
          }, 5000);
        }

        logger.debug('APP_SHELL', 'Setting app state', { chainCount: chains.length });
        setState((prev) => ({
          ...prev,
          chains,
          chainsRevision: prev.chainsRevision + 1,
          scheduledSessions,
          activeSession,
          completionHistory: migratedCompletionHistory,
          rsipNodes,
          rsipMeta,
          taskTimeStats,
          currentView: activeSession ? 'focus' : 'dashboard',
        }));

        // Clean up expired sessions.
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
      fireAndForget(loadData(), { label: 'APP_SHELL loadData' });
    } else {
      setIsLoadingData(false);
    }
  }, [storage, isInitialized, setState]);

  return { isLoadingData };
}

