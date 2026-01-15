import React, { useMemo, useCallback, useEffect, useState, lazy, Suspense } from 'react';
import type { Chain, CompletionHistory, ExceptionRule, RSIPMeta, RSIPNode, ScheduledSession } from '../types';
import { useStorage } from '../storage/useStorage';
import { useI18n } from '../i18n';
import { ThemeToggle } from './ThemeToggle';
import { VirtualizedChainList } from './VirtualizedChainList';
import { getTopLevelChains } from '../utils/chainTree';
import { queryOptimizer } from '../utils/queryOptimizer';
import { Download, TreePine, Trash2, Rocket, Link, Plus, Layers, Settings } from 'lucide-react';
import { NotificationToggle } from './NotificationToggle';
import { isDev } from '../utils/env';
import { logger } from '../utils/logger';

const ImportExportModal = lazy(() => import('./ImportExportModal').then(m => ({ default: m.ImportExportModal })));
const RecycleBinModal = lazy(() => import('./RecycleBinModal').then(m => ({ default: m.RecycleBinModal })));
const AccountModal = lazy(() => import('./AccountModal').then(m => ({ default: m.AccountModal })));
const PerformanceMonitor = lazy(() => import('./PerformanceMonitor').then(m => ({ default: m.PerformanceMonitor })));
const DailyCheckin = lazy(() => import('./DailyCheckin').then(m => ({ default: m.DailyCheckin })));
const DailyCheckinDemo = lazy(() => import('./DailyCheckinDemo').then(m => ({ default: m.DailyCheckinDemo })));

const CheckinPlaceholder = () => (
  <div className="max-w-2xl mx-auto h-24 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
);

interface DashboardProps {
  chains: Chain[];
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
  onImportChains: (chains: Chain[], options?: { history?: CompletionHistory[]; rsipNodes?: RSIPNode[]; rsipMeta?: RSIPMeta; exceptionRules?: ExceptionRule[] }) => Promise<void>;
  onRestoreChains?: (chainIds: string[]) => void;
  onPermanentDeleteChains?: (chainIds: string[]) => void;
  history?: CompletionHistory[];
  rsipNodes?: RSIPNode[];
  rsipMeta?: RSIPMeta;
}

// Performance optimized Dashboard component with React.memo and proper memoization
export const Dashboard: React.FC<DashboardProps> = React.memo(({
  chains,
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
      chains: chains.map(c => ({ id: c.id, name: c.name, type: c.type, parentId: c.parentId })),
    });
  }

  // Optimize chain tree building with deep memoization
  const chainTree = useMemo(() => {
    if (isDev) {
      logger.debug('DASHBOARD', 'Rebuilding chainTree', { chainCount: chains.length });
    }
    return queryOptimizer.memoizedBuildChainTree(chains);
  }, [chains]);

  // Memoize top level chains calculation
  const topLevelChains = useMemo(() => {
    const result = getTopLevelChains(chainTree);
    if (isDev) {
      logger.debug('DASHBOARD', 'Top-level chains', {
        topLevelCount: result.length,
        chains: result.map(c => ({ id: c.id, name: c.name, type: c.type })),
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
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('DASHBOARD', 'Failed to load recycle bin statistics', undefined, err);
      }
    }
  }, [storage]);

  // Only reload stats when chains count changes, not on every chain mutation
  const chainsCount = chains.length;
  useEffect(() => {
    loadRecycleBinStats();
  }, [chainsCount, loadRecycleBinStats]);

  // Memoize event handlers to prevent child component re-renders
  const handleShowImportExport = useCallback(() => setShowImportExport(true), []);
  const handleHideImportExport = useCallback(() => setShowImportExport(false), []);
  const handleShowRecycleBin = useCallback(() => setShowRecycleBin(true), []);
  const handleHideRecycleBin = useCallback(() => setShowRecycleBin(false), []);
  const handleShowAccountModal = useCallback(() => setShowAccountModal(true), []);
  const handleHideAccountModal = useCallback(() => setShowAccountModal(false), []);

  // Memoize restore and delete handlers to prevent recreating functions
  const handleRestore = useCallback(async (chainIds: string[]) => {
    if (onRestoreChains) {
      await onRestoreChains(chainIds);
      // Force reload of recycle bin stats after successful restore
      await loadRecycleBinStats();
      logger.info('DASHBOARD', 'Restored chains and updated stats', { restoredCount: chainIds.length });
    }
  }, [onRestoreChains, loadRecycleBinStats]);

  const handlePermanentDelete = useCallback(async (chainIds: string[]) => {
    if (onPermanentDeleteChains) {
      await onPermanentDeleteChains(chainIds);
      // Force reload of recycle bin stats after successful permanent deletion
      await loadRecycleBinStats();
      logger.info('DASHBOARD', 'Permanently deleted chains and updated stats', { deletedCount: chainIds.length });
    }
  }, [onPermanentDeleteChains, loadRecycleBinStats]);

  const handleImport = useCallback(async (newChains: Chain[], options?: { history?: CompletionHistory[]; rsipNodes?: RSIPNode[]; rsipMeta?: RSIPMeta; exceptionRules?: ExceptionRule[] }) => {
    await onImportChains(newChains, options);
  }, [onImportChains]);

  // Memoize scheduled session lookup to prevent recalculation on every render
  const getScheduledSession = useCallback((chainId: string) => {
    return scheduledSessions.find(session => session.chainId === chainId);
  }, [scheduledSessions]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Theme toggle in header */}
        <div className="flex justify-end items-center space-x-4 mb-6">
          <button
            onClick={handleShowAccountModal}
            className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-2xl border border-gray-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
            title={t('settings.title')}
          >
            <Settings size={18} />
            <span className="font-chinese text-sm">{t('settings.button')}</span>
          </button>
          <NotificationToggle />
          <ThemeToggle />
        </div>

        <header className="text-center mb-16 animate-fade-in">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center shadow-xl">
              <Rocket className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-5xl md:text-6xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-2">
                Momentum
              </h1>
              <p className="text-sm font-mono text-gray-600 dark:text-slate-400 tracking-wider uppercase">
                {tr('CTDP 协议', 'CTDP Protocol')}
              </p>
            </div>
          </div>

          <p className="text-gray-700 dark:text-slate-300 max-w-3xl mx-auto text-lg leading-relaxed font-chinese">
            {language === 'zh' ? (
              <>
                基于链式时延协议理论，通过<span className="font-semibold text-primary-500">神圣座位原理</span>、
                <span className="font-semibold text-primary-500">下必为例原理</span>和
                <span className="font-semibold text-primary-500">线性时延原理</span>，帮助你建立强大的习惯链条
              </>
            ) : (
              <>
                Built on the Chained Time-Delay Protocol (CTDP), using{' '}
                <span className="font-semibold text-primary-500">the Sacred Seat Principle</span>,{' '}
                <span className="font-semibold text-primary-500">the Precedent Principle</span>, and{' '}
                <span className="font-semibold text-primary-500">the Linear Time-Delay Principle</span> to help you build
                powerful habit chains.
              </>
            )}
          </p>
        </header>

        {/* Daily Check-in Section - lazy loaded */}
        <div className="mb-12 animate-fade-in">
          <Suspense fallback={<CheckinPlaceholder />}>
            {isSupabase ? (
              <DailyCheckin className="max-w-2xl mx-auto" />
            ) : (
              <DailyCheckinDemo className="max-w-2xl mx-auto" />
            )}
          </Suspense>
        </div>

        {isLoading ? (
          <div className="text-center py-20 animate-slide-up">
            <div className="bento-card max-w-lg mx-auto">
              <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-8 shadow-2xl">
                <div className="w-8 h-8 border-[3px] border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
              <h2 className="text-3xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-4">
                {tr('正在加载任务链...', 'Loading task chains…')}
              </h2>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                {tr('正在从云端同步你的数据', 'Syncing your data from the cloud')}
              </p>
            </div>
          </div>
        ) : (
          chains.length === 0 ? (
            <div className="text-center py-20 animate-slide-up">
              <div className="bento-card max-w-lg mx-auto">
                <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-8 shadow-2xl">
                  <Link className="text-white" size={32} />
                </div>
                <h2 className="text-3xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-4">
                  {tr('创建你的第一条链', 'Create your first chain')}
                </h2>
                <p className="text-gray-700 dark:text-slate-300 mb-8 leading-relaxed">
                  {tr(
                    '链代表你想要持续做的任务。每次成功完成，你的记录就会增长一点。',
                    'A chain represents a task you want to keep doing. Every successful completion grows your streak.'
                  )}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={onCreateChain}
                    className="gradient-primary hover:shadow-2xl text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-3 hover:scale-105 shadow-xl"
                  >
                    <Plus size={18} />
                    <span className="font-chinese font-semibold">{tr('创建第一条链', 'Create chain')}</span>
                  </button>
                  <button
                    onClick={handleShowImportExport}
                    className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-6 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg"
                  >
                    <Download size={16} />
                    <span className="font-chinese font-medium">{tr('数据管理', 'Data')}</span>
                  </button>
                  {onOpenRSIP && (
                    <button
                      onClick={onOpenRSIP}
                      className="bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-6 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg"
                      title={tr('国策树（RSIP）', 'RSIP Policy Tree')}
                    >
                      <TreePine size={16} />
                      <span className="font-chinese font-medium">{tr('国策树', 'RSIP Tree')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-slide-up">
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="text-3xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-2">
                    {tr('你的任务链', 'Your Task Chains')}
                  </h2>
                  <p className="text-gray-600 dark:text-slate-400 font-mono text-sm tracking-wide">
                    {tr('任务链列表', 'YOUR TASK CHAINS')}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleShowRecycleBin}
                    className="relative bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-4 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg"
                    title={tr('回收箱', 'Recycle bin')}
                  >
                    <Trash2 size={16} />
                    <span className="font-chinese font-medium">{tr('回收箱', 'Recycle bin')}</span>
                    {recycleBinCount > 0 && (
                      <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {recycleBinCount > 99 ? '99+' : recycleBinCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={handleShowImportExport}
                    className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-4 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg"
                  >
                    <Download size={16} />
                    <span className="font-chinese font-medium">{tr('数据管理', 'Data')}</span>
                  </button>
                  <button
                    onClick={onOpenRSIP}
                    className="bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg"
                    title={tr('国策树（RSIP）', 'RSIP Policy Tree')}
                  >
                    <TreePine size={16} />
                    <span className="font-chinese font-medium">{tr('国策树', 'RSIP Tree')}</span>
                  </button>
                  <button
                    onClick={onCreateChain}
                    className="gradient-dark hover:shadow-xl text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg"
                  >
                    <Plus size={16} />
                    <span className="font-chinese font-medium">{tr('新建链', 'New Chain')}</span>
                  </button>
                  {onCreateTaskGroup && (
                    <button
                      onClick={onCreateTaskGroup}
                      className="bg-green-500 hover:bg-green-600 hover:shadow-xl text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center space-x-2 hover:scale-105 shadow-lg"
                    >
                      <Layers size={16} />
                      <span className="font-chinese font-medium">{tr('新建任务群', 'New Group')}</span>
                    </button>
                  )}
                </div>
              </div>

              <VirtualizedChainList
                topLevelChains={topLevelChains}
                getScheduledSession={getScheduledSession}
                onStartChain={onStartChain}
                onScheduleChain={onScheduleChain}
                onViewDetail={onViewChainDetail}
                onCancelScheduledSession={onCancelScheduledSession}
                onCompleteBooking={onCompleteBooking}
                onDelete={onDeleteChain}
              />
            </div>
          ))}
      </div>

      {/* Import/Export Modal */}
      {showImportExport && (
        <Suspense fallback={null}>
          <ImportExportModal
            chains={chains}
            history={history}
            rsipNodes={rsipNodes}
            rsipMeta={rsipMeta}
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
            onToggle={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
          />
        </Suspense>
      )}
    </div>
  );
});

// Add display name for better debugging
Dashboard.displayName = 'Dashboard';
