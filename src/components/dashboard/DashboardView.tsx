import { lazy, Suspense, useState } from 'react';
import { isDev } from '../../utils/env';
import { lazyWithChunkRecovery } from '../../utils/lazyWithChunkRecovery';
import { ChainCardSkeleton } from './ChainCardSkeleton';
import { DashboardChainsSection } from './DashboardChainsSection';
import { DashboardEmptyState } from './DashboardEmptyState';
import { DashboardHero } from './DashboardHero';
import { DashboardRecommendSection } from './DashboardRecommendSection';
import { DashboardTopBar } from './DashboardTopBar';
import { TodayPlanSection } from './TodayPlanSection';
import { DialogShell } from '../shared/DialogShell';
import type { DashboardProps } from './types';
import type { DashboardController } from './useDashboardController';

const ImportExportModal = lazy(
  lazyWithChunkRecovery(
    () =>
      import('../ImportExportModal').then((module) => ({
        default: module.ImportExportModal,
      })),
    'ImportExportModal',
  ),
);
const RecycleBinModal = lazy(
  lazyWithChunkRecovery(
    () =>
      import('../RecycleBinModal').then((module) => ({
        default: module.RecycleBinModal,
      })),
    'RecycleBinModal',
  ),
);
const AccountModal = lazy(
  lazyWithChunkRecovery(
    () =>
      import('../AccountModal').then((module) => ({
        default: module.AccountModal,
      })),
    'AccountModal',
  ),
);
const PerformanceMonitor = lazy(
  lazyWithChunkRecovery(
    () =>
      import('../PerformanceMonitor').then((module) => ({
        default: module.PerformanceMonitor,
      })),
    'PerformanceMonitor',
  ),
);
const DailyCheckin = lazy(
  lazyWithChunkRecovery(
    () =>
      import('../DailyCheckin').then((module) => ({
        default: module.DailyCheckin,
      })),
    'DailyCheckin',
  ),
);
const DailyCheckinDemo = lazy(
  lazyWithChunkRecovery(
    () =>
      import('../DailyCheckinDemo').then((module) => ({
        default: module.DailyCheckinDemo,
      })),
    'DailyCheckinDemo',
  ),
);

const CheckinPlaceholder = () => (
  <div className="mx-auto h-24 max-w-2xl animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800" />
);

type DashboardViewProps = DashboardProps & DashboardController;

export function DashboardView({
  chains,
  scheduledSessions: _scheduledSessions,
  chainsRevision: _chainsRevision,
  dailyPlans,
  isLoading = false,
  onCreateChain,
  onCreateChainForToday,
  onCreateTaskGroup,
  onOpenRSIP,
  onStartChain,
  onAddPlanUnits,
  onRemovePlanUnits,
  onStartPlanItem,
  onScheduleChain,
  onViewChainDetail,
  onCancelScheduledSession,
  onCompleteBooking,
  onDeleteChain,
  onImportChains: _onImportChains,
  onRestoreChains: _onRestoreChains,
  onPermanentDeleteChains: _onPermanentDeleteChains,
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
  t,
  tr,
  language,
  topLevelChains,
  recycleBinCount,
  canUseCheckin,
  canUseSupabase,
  isChoicePending,
  showImportExport,
  showRecycleBin,
  showAccountModal,
  showPerformanceMonitor,
  getScheduledSession,
  handleImport,
  handleRestore,
  handlePermanentDelete,
  showImportExportModal,
  hideImportExportModal,
  showRecycleBinModal,
  hideRecycleBinModal,
  showAccount,
  hideAccount,
  togglePerformanceMonitor,
  enableCloudMode,
  keepLocalMode,
}: DashboardViewProps) {
  const [pendingStart, setPendingStart] = useState<{
    chainId: string;
    planItemId?: string;
  } | null>(null);
  const pendingChain = pendingStart
    ? chains.find((chain) => chain.id === pendingStart.chainId)
    : null;

  const confirmStart = () => {
    if (!pendingStart) return;
    const request = pendingStart;
    setPendingStart(null);
    if (request.planItemId) {
      void onStartPlanItem(request.chainId, request.planItemId);
      return;
    }
    onStartChain(request.chainId);
  };

  return (
    <div className="bg-background min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <DashboardTopBar
          settingsTitle={t('settings.title')}
          settingsButtonText={t('settings.button')}
          onShowAccountModal={showAccount}
        />
        <DashboardHero
          language={language}
          nextStepLabel={t('dashboard.hero.nextStep')}
          tr={tr}
        />
        {isChoicePending && (
          <section className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm dark:border-blue-800/60 dark:bg-blue-900/20">
            <h3 className="mb-2 font-chinese text-lg font-semibold text-blue-900 dark:text-blue-100">
              {tr('选择你的数据模式', 'Choose your data mode')}
            </h3>
            <p className="mb-4 text-sm text-blue-800 dark:text-blue-200">
              {tr(
                '默认是本地模式。你也可以连接 Supabase 开启登录与多端同步。',
                'Local mode is the default. You can also connect Supabase for sign-in and multi-device sync.',
              )}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={keepLocalMode}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {tr('继续本地模式', 'Continue with local mode')}
              </button>
              <button
                type="button"
                onClick={enableCloudMode}
                disabled={!canUseSupabase}
                className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tr('连接云端同步', 'Connect cloud sync')}
              </button>
            </div>
          </section>
        )}

        <div className="mb-12 animate-fade-in">
          <Suspense fallback={<CheckinPlaceholder />}>
            {canUseCheckin ? (
              <DailyCheckin className="mx-auto max-w-2xl" />
            ) : (
              <DailyCheckinDemo className="mx-auto max-w-2xl" />
            )}
          </Suspense>
        </div>

        <TodayPlanSection
          plans={dailyPlans}
          chains={chains}
          onAddUnits={onAddPlanUnits}
          onRemoveUnits={onRemovePlanUnits}
          onCreateChainForToday={onCreateChainForToday}
          onStartItem={(chainId, itemId) => {
            setPendingStart({ chainId, planItemId: itemId });
            return Promise.resolve();
          }}
          tr={tr}
        />

        {isLoading && (
          <div className="animate-slide-up py-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <ChainCardSkeleton />
              <ChainCardSkeleton />
              <ChainCardSkeleton />
            </div>
          </div>
        )}

        {!isLoading && chains.length === 0 && (
          <DashboardEmptyState
            onCreateChain={onCreateChain}
            onShowImportExport={showImportExportModal}
            onOpenRSIP={onOpenRSIP}
            tr={tr}
          />
        )}

        {!isLoading && chains.length !== 0 && (
          <>
            <DashboardRecommendSection
              chains={topLevelChains}
              onStartChain={(chainId) => setPendingStart({ chainId })}
              tr={tr}
            />
            <DashboardChainsSection
              topLevelChains={topLevelChains}
              recycleBinCount={recycleBinCount}
              getScheduledSession={getScheduledSession}
              onStartChain={(chainId) => setPendingStart({ chainId })}
              onScheduleChain={onScheduleChain}
              onViewChainDetail={onViewChainDetail}
              onCancelScheduledSession={onCancelScheduledSession}
              onCompleteBooking={onCompleteBooking}
              onDeleteChain={onDeleteChain}
              onShowRecycleBin={showRecycleBinModal}
              onShowImportExport={showImportExportModal}
              onOpenRSIP={onOpenRSIP}
              onCreateChain={onCreateChain}
              onCreateTaskGroup={onCreateTaskGroup}
              tr={tr}
            />
          </>
        )}
      </div>

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
            onClose={hideImportExportModal}
          />
        </Suspense>
      )}

      {pendingStart && pendingChain && (
        <DialogShell
          titleId="start-task-confirm-title"
          descriptionId="start-task-confirm-description"
          role="alertdialog"
          onClose={() => setPendingStart(null)}
          className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-slate-600 dark:bg-slate-800"
        >
          <h2
            id="start-task-confirm-title"
            className="font-chinese text-xl font-bold text-gray-950 dark:text-slate-100"
          >
            {tr('确认开启任务？', 'Start this task?')}
          </h2>
          <p
            id="start-task-confirm-description"
            className="mt-3 font-chinese text-gray-600 dark:text-slate-300"
          >
            {tr('即将开启：', 'About to start: ')}
            <span className="font-semibold text-gray-950 dark:text-white">
              {pendingChain.name}
            </span>
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            {tr(
              '确认后将进入该任务的专注流程。',
              'Confirming opens this task’s focus session.',
            )}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              data-dialog-initial-focus
              onClick={() => setPendingStart(null)}
              className="rounded-xl bg-gray-100 px-4 py-2.5 font-chinese font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            >
              {tr('取消', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={confirmStart}
              className="rounded-xl bg-primary-600 px-4 py-2.5 font-chinese font-medium text-white transition hover:bg-primary-700"
            >
              {tr('确认开启', 'Start task')}
            </button>
          </div>
        </DialogShell>
      )}
      {showRecycleBin && (
        <Suspense fallback={null}>
          <RecycleBinModal
            isOpen
            onClose={hideRecycleBinModal}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
          />
        </Suspense>
      )}
      {showAccountModal && (
        <Suspense fallback={null}>
          <AccountModal isOpen onClose={hideAccount} />
        </Suspense>
      )}
      {isDev && (
        <Suspense fallback={null}>
          <PerformanceMonitor
            isVisible={showPerformanceMonitor}
            onToggle={togglePerformanceMonitor}
          />
        </Suspense>
      )}
    </div>
  );
}
