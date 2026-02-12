import React, {
  useMemo,
  useCallback,
  useEffect,
  useState,
  lazy,
  Suspense,
} from 'react';
import type {
  Chain,
  CompletionHistory,
  ExceptionRule,
  RSIPExecutionRecord,
  RSIPLibraryEntry,
  RSIPMeta,
  RSIPNode,
  RSIPNodeGroup,
  RSIPRunRecord,
  ScheduledSession,
  RSIPTaskLink,
} from '../types';
import type { PetState } from '../types/pet';
import { useStorage } from '../storage/useStorage';
import { useI18n } from '../i18n';
import { getTopLevelChains } from '../utils/chainTree';
import { queryOptimizer } from '../utils/queryOptimizer';
import { isDev } from '../utils/env';
import { logger } from '../utils/logger';
import { toError } from '../utils/errorMessage';
import { DashboardChainsSection } from './dashboard/DashboardChainsSection';
import { DashboardEmptyState } from './dashboard/DashboardEmptyState';
import { DashboardHero } from './dashboard/DashboardHero';
import { DashboardTopBar } from './dashboard/DashboardTopBar';

const ImportExportModal = lazy(() =>
  import('./ImportExportModal').then((m) => ({ default: m.ImportExportModal })),
);
const RecycleBinModal = lazy(() =>
  import('./RecycleBinModal').then((m) => ({ default: m.RecycleBinModal })),
);
const AccountModal = lazy(() =>
  import('./AccountModal').then((m) => ({ default: m.AccountModal })),
);
const PerformanceMonitor = lazy(() =>
  import('./PerformanceMonitor').then((m) => ({
    default: m.PerformanceMonitor,
  })),
);
const DailyCheckin = lazy(() =>
  import('./DailyCheckin').then((m) => ({ default: m.DailyCheckin })),
);
const DailyCheckinDemo = lazy(() =>
  import('./DailyCheckinDemo').then((m) => ({ default: m.DailyCheckinDemo })),
);

const CheckinPlaceholder = () => (
  <div className="mx-auto h-24 max-w-2xl animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800" />
);

interface DashboardProps {
  chains: Chain[];
  chainsRevision: number;
  scheduledSessions: ScheduledSession[];
  isLoading?: boolean;
  onCreateChain: () => void;
  onCreateTaskGroup?: () => void;
  onOpenRSIP?: () => void;
  onStartChain: (chainId: string) => void;
  onScheduleChain: (chainId: string) => void;
  onViewChainDetail: (chainId: string) => void;
  onCancelScheduledSession?: (chainId: string) => void;
  onCompleteBooking?: (chainId: string) => void;
  onDeleteChain: (chainId: string) => void;
  onImportChains: (
    chains: Chain[],
    options?: {
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
    },
  ) => Promise<void>;
  onRestoreChains?: (chainIds: string[]) => void;
  onPermanentDeleteChains?: (chainIds: string[]) => void;
  history?: CompletionHistory[];
  rsipNodes?: RSIPNode[];
  rsipMeta?: RSIPMeta;
  rsipGroups?: RSIPNodeGroup[];
  rsipPolicyLibrary?: RSIPLibraryEntry[];
  rsipRunHistory?: RSIPRunRecord[];
  rsipExecutionRecords?: RSIPExecutionRecord[];
  rsipTaskLinks?: RSIPTaskLink[];
  petState?: PetState | null;
  userPreferences?: unknown;
}

// Performance optimized Dashboard component with React.memo and proper memoization
export const Dashboard: React.FC<DashboardProps> = React.memo(
  ({
    chains,
    chainsRevision,
    scheduledSessions,
    isLoading = false,
    onCreateChain,
    onCreateTaskGroup,
    onStartChain,
    onScheduleChain,
    onViewChainDetail,
    onCancelScheduledSession,
    onCompleteBooking,
    onDeleteChain,
    onImportChains,
    onRestoreChains,
    onPermanentDeleteChains,
    history,
    rsipNodes,
    rsipMeta,
    rsipGroups,
    rsipPolicyLibrary,
    rsipRunHistory,
    rsipExecutionRecords,
    rsipTaskLinks,
    petState,
    userPreferences,
    onOpenRSIP,
  }) => {
    const [showImportExport, setShowImportExport] = useState(false);
    const [showRecycleBin, setShowRecycleBin] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(isDev);
    const [recycleBinCount, setRecycleBinCount] = useState(0);
    const storage = useStorage();
    const { t, tr, language } = useI18n();
    const isSupabase = storage.kind === 'supabase';

    // Only log in development mode to improve production performance
    if (isDev) {
      logger.debug('DASHBOARD', 'Received chains', {
        chainCount: chains.length,
        chains: chains.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          parentId: c.parentId,
        })),
      });
    }

    // Optimize chain tree building with deep memoization
    const chainTree = useMemo(() => {
      if (isDev) {
        logger.debug('DASHBOARD', 'Rebuilding chainTree', {
          chainCount: chains.length,
        });
      }
      return queryOptimizer.memoizedBuildChainTree(chains, chainsRevision);
    }, [chains, chainsRevision]);

    // Memoize top level chains calculation
    const topLevelChains = useMemo(() => {
      const result = getTopLevelChains(chainTree);
      if (isDev) {
        logger.debug('DASHBOARD', 'Top-level chains', {
          topLevelCount: result.length,
          chains: result.map((c) => ({ id: c.id, name: c.name, type: c.type })),
        });
      }
      return result;
    }, [chainTree]);

    // Optimize recycle bin stats loading - lazy load service
    const loadRecycleBinStats = useCallback(async () => {
      try {
        const deletedChains = await storage.getDeletedChains();
        setRecycleBinCount(deletedChains.length);
      } catch (error) {
        if (isDev) {
          logger.error(
            'DASHBOARD',
            'Failed to load recycle bin statistics',
            undefined,
            toError(error),
          );
        }
      }
    }, [storage]);

    // Only reload stats when chains count changes, not on every chain mutation
    const chainsCount = chains.length;
    useEffect(() => {
      loadRecycleBinStats();
    }, [chainsCount, loadRecycleBinStats]);

    // Memoize event handlers to prevent child component re-renders
    const handleShowImportExport = useCallback(
      () => setShowImportExport(true),
      [],
    );
    const handleHideImportExport = useCallback(
      () => setShowImportExport(false),
      [],
    );
    const handleShowRecycleBin = useCallback(() => setShowRecycleBin(true), []);
    const handleHideRecycleBin = useCallback(
      () => setShowRecycleBin(false),
      [],
    );
    const handleShowAccountModal = useCallback(
      () => setShowAccountModal(true),
      [],
    );
    const handleHideAccountModal = useCallback(
      () => setShowAccountModal(false),
      [],
    );

    // Memoize restore and delete handlers to prevent recreating functions
    const handleRestore = useCallback(
      async (chainIds: string[]) => {
        if (onRestoreChains) {
          await onRestoreChains(chainIds);
          // Force reload of recycle bin stats after successful restore
          await loadRecycleBinStats();
          logger.info('DASHBOARD', 'Restored chains and updated stats', {
            restoredCount: chainIds.length,
          });
        }
      },
      [onRestoreChains, loadRecycleBinStats],
    );

    const handlePermanentDelete = useCallback(
      async (chainIds: string[]) => {
        if (onPermanentDeleteChains) {
          await onPermanentDeleteChains(chainIds);
          // Force reload of recycle bin stats after successful permanent deletion
          await loadRecycleBinStats();
          logger.info(
            'DASHBOARD',
            'Permanently deleted chains and updated stats',
            { deletedCount: chainIds.length },
          );
        }
      },
      [onPermanentDeleteChains, loadRecycleBinStats],
    );

    const handleImport = useCallback(
      async (
        newChains: Chain[],
        options?: {
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
        },
      ) => {
        await onImportChains(newChains, options);
      },
      [onImportChains],
    );

    // Memoize scheduled session lookup to prevent recalculation on every render
    const getScheduledSession = useCallback(
      (chainId: string) => {
        return scheduledSessions.find((session) => session.chainId === chainId);
      },
      [scheduledSessions],
    );

    return (
      <div className="bg-background min-h-screen p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <DashboardTopBar
            settingsTitle={t('settings.title')}
            settingsButtonText={t('settings.button')}
            onShowAccountModal={handleShowAccountModal}
          />

          <DashboardHero language={language} tr={tr} />

          {/* Daily Check-in Section - lazy loaded */}
          <div className="mb-12 animate-fade-in">
            <Suspense fallback={<CheckinPlaceholder />}>
              {isSupabase ? (
                <DailyCheckin className="mx-auto max-w-2xl" />
              ) : (
                <DailyCheckinDemo className="mx-auto max-w-2xl" />
              )}
            </Suspense>
          </div>

          {isLoading && (
            <div className="animate-slide-up py-20 text-center">
              <div className="bento-card mx-auto max-w-lg">
                <div className="gradient-primary mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl shadow-2xl">
                  <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/30 border-t-white"></div>
                </div>
                <h2 className="mb-4 font-chinese text-3xl font-bold text-gray-900 dark:text-slate-100">
                  {tr('正在加载任务链...', 'Loading task chains…')}
                </h2>
                <p className="leading-relaxed text-gray-700 dark:text-slate-300">
                  {tr(
                    '正在从云端同步你的数据',
                    'Syncing your data from the cloud',
                  )}
                </p>
              </div>
            </div>
          )}

          {!isLoading && chains.length === 0 && (
            <DashboardEmptyState
              onCreateChain={onCreateChain}
              onShowImportExport={handleShowImportExport}
              onOpenRSIP={onOpenRSIP}
              tr={tr}
            />
          )}

          {!isLoading && chains.length !== 0 && (
            <DashboardChainsSection
              topLevelChains={topLevelChains}
              recycleBinCount={recycleBinCount}
              getScheduledSession={getScheduledSession}
              onStartChain={onStartChain}
              onScheduleChain={onScheduleChain}
              onViewChainDetail={onViewChainDetail}
              onCancelScheduledSession={onCancelScheduledSession}
              onCompleteBooking={onCompleteBooking}
              onDeleteChain={onDeleteChain}
              onShowRecycleBin={handleShowRecycleBin}
              onShowImportExport={handleShowImportExport}
              onOpenRSIP={onOpenRSIP}
              onCreateChain={onCreateChain}
              onCreateTaskGroup={onCreateTaskGroup}
              tr={tr}
            />
          )}
        </div>

        {/* Import/Export Modal */}
        {showImportExport && (
          <Suspense fallback={null}>
            <ImportExportModal
              chains={chains}
              history={history}
              rsipNodes={rsipNodes}
              rsipMeta={rsipMeta}
              rsipGroups={rsipGroups}
              rsipPolicyLibrary={rsipPolicyLibrary}
              rsipRunHistory={rsipRunHistory}
              rsipExecutionRecords={rsipExecutionRecords}
              rsipTaskLinks={rsipTaskLinks}
              petState={petState}
              userPreferences={userPreferences}
              onImport={handleImport}
              onClose={handleHideImportExport}
            />
          </Suspense>
        )}

        {/* Recycle Bin Modal */}
        {showRecycleBin && (
          <Suspense fallback={null}>
            <RecycleBinModal
              isOpen={showRecycleBin}
              onClose={handleHideRecycleBin}
              onRestore={handleRestore}
              onPermanentDelete={handlePermanentDelete}
            />
          </Suspense>
        )}

        {/* Account Modal */}
        {showAccountModal && (
          <Suspense fallback={null}>
            <AccountModal
              isOpen={showAccountModal}
              onClose={handleHideAccountModal}
            />
          </Suspense>
        )}
        {/* Performance Monitor (Development) */}
        {isDev && (
          <Suspense fallback={null}>
            <PerformanceMonitor
              isVisible={showPerformanceMonitor}
              onToggle={() =>
                setShowPerformanceMonitor(!showPerformanceMonitor)
              }
            />
          </Suspense>
        )}
      </div>
    );
  },
);

// Add display name for better debugging
Dashboard.displayName = 'Dashboard';
