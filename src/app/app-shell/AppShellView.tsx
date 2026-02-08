import { Suspense, lazy } from 'react';
import { Dashboard } from '../../components/Dashboard';
import { useI18n } from '../../i18n';
import { queryOptimizer } from '../../utils/queryOptimizer';
import { LoadingFallback } from './LoadingFallback';
import type { AppShellViewProps } from './types';

const RSIPView = lazy(() =>
  import('../../components/RSIPView').then((m) => ({ default: m.RSIPView })),
);
const ChainEditor = lazy(() =>
  import('../../components/ChainEditor').then((m) => ({
    default: m.ChainEditor,
  })),
);
const FocusMode = lazy(() =>
  import('../../components/FocusMode').then((m) => ({ default: m.FocusMode })),
);
const ChainDetail = lazy(() =>
  import('../../components/ChainDetail').then((m) => ({
    default: m.ChainDetail,
  })),
);
const GroupView = lazy(() =>
  import('../../components/GroupView').then((m) => ({ default: m.GroupView })),
);
const TaskGroupEditor = lazy(() =>
  import('../../components/TaskGroupEditor').then((m) => ({
    default: m.TaskGroupEditor,
  })),
);
const AuxiliaryJudgment = lazy(() =>
  import('../../components/AuxiliaryJudgment').then((m) => ({
    default: m.AuxiliaryJudgment,
  })),
);
const BettingModal = lazy(() =>
  import('../../components/BettingModal').then((m) => ({
    default: m.BettingModal,
  })),
);
const PetWidget = lazy(() =>
  import('../../components/pet/PetWidget').then((m) => ({
    default: m.PetWidget,
  })),
);

export function AppShellView({
  state,
  isInitialized,
  isLoadingData,
  showAuxiliaryJudgment,
  setShowAuxiliaryJudgment,
  showBettingModal,
  pendingChainId,
  currentSessionId,
  handleCreateChain,
  handleCreateTaskGroup,
  handleEditChain,
  handleSaveChain,
  handleViewChainDetail,
  handleBackToDashboard,
  openRSIP,
  saveRSIPNodes,
  saveRSIPMeta,
  handleScheduleChain,
  handleStartChain,
  handleCancelScheduledSession,
  handleCompleteBooking,
  handleCompleteSession,
  handleInterruptSession,
  handlePauseSession,
  handleResumeSession,
  handleDeleteChain,
  handleRestoreChains,
  handlePermanentDeleteChains,
  handleAuxiliaryJudgmentFailure,
  handleAuxiliaryJudgmentAllow,
  handleImportChains,
  handleImportUnits,
  handleUpdateTaskRepeatCount,
  handleReorderUnit,
  handleBetPlaced,
  handleBetCancelled,
  petDomain,
}: AppShellViewProps) {
  const { tr } = useI18n();

  const renderAuxiliaryJudgment = () => {
    if (!showAuxiliaryJudgment) return null;

    return (
      <Suspense fallback={null}>
        <AuxiliaryJudgment
          chain={state.chains.find((c) => c.id === showAuxiliaryJudgment)!}
          onJudgmentFailure={() =>
            handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment)
          }
          onJudgmentAllow={(exceptionRule) =>
            handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)
          }
          onCancel={() => setShowAuxiliaryJudgment(null)}
        />
      </Suspense>
    );
  };

  const renderCurrentView = () => {
    if (!isInitialized) {
      return (
        <div className="bg-background flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="gradient-primary mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl shadow-xl">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
            </div>
            <h2 className="mb-2 font-chinese text-2xl font-bold text-gray-900 dark:text-slate-100">
              {tr('正在初始化…', 'Initializing…')}
            </h2>
            <p className="font-mono text-sm text-gray-600 dark:text-slate-400">
              {tr('正在初始化应用', 'INITIALIZING APPLICATION')}
            </p>
          </div>
        </div>
      );
    }

    const editorProps = {
      chain: state.editingChain || undefined,
      isEditing: !!state.editingChain,
      initialParentId: state.viewingChainId || undefined,
      onSave: handleSaveChain,
      onCancel: handleBackToDashboard,
    };

    switch (state.currentView) {
      case 'editor':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ChainEditor {...editorProps} />
            {renderAuxiliaryJudgment()}
          </Suspense>
        );

      case 'taskgroup-editor':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <TaskGroupEditor {...editorProps} />
          </Suspense>
        );

      case 'focus': {
        const activeChain = state.chains.find(
          (c) => c.id === state.activeSession?.chainId,
        );
        if (!state.activeSession || !activeChain) return null;

        return (
          <Suspense fallback={<LoadingFallback />}>
            <FocusMode
              session={state.activeSession}
              chain={activeChain}
              onComplete={handleCompleteSession}
              onInterrupt={handleInterruptSession}
              onPause={handlePauseSession}
              onResume={handleResumeSession}
            />
            {renderAuxiliaryJudgment()}
          </Suspense>
        );
      }

      case 'detail': {
        const viewingChain = state.chains.find(
          (c) => c.id === state.viewingChainId,
        );
        if (!viewingChain) return null;

        return (
          <Suspense fallback={<LoadingFallback />}>
            <ChainDetail
              chain={viewingChain}
              history={state.completionHistory}
              onBack={handleBackToDashboard}
              onEdit={() => handleEditChain(viewingChain.id)}
              onDelete={() => void handleDeleteChain(viewingChain.id)}
            />
            {renderAuxiliaryJudgment()}
          </Suspense>
        );
      }

      case 'group': {
        const viewingGroup = state.chains.find(
          (c) => c.id === state.viewingChainId,
        );
        if (!viewingGroup) return null;

        const chainTree = queryOptimizer.memoizedBuildChainTree(
          state.chains,
          state.chainsRevision,
        );
        const groupNode = chainTree.find(
          (node) => node.id === state.viewingChainId,
        );
        if (!groupNode) return null;

        return (
          <Suspense fallback={<LoadingFallback />}>
            <GroupView
              group={groupNode}
              scheduledSessions={state.scheduledSessions}
              availableUnits={state.chains}
              onBack={handleBackToDashboard}
              onStartChain={handleStartChain}
              onScheduleChain={handleScheduleChain}
              onViewDetail={handleViewChainDetail}
              onEditChain={(chainId) => handleEditChain(chainId)}
              onDeleteChain={handleDeleteChain}
              onAddUnit={() => handleCreateChain(state.viewingChainId!)}
              onImportUnits={handleImportUnits}
              onUpdateTaskRepeatCount={handleUpdateTaskRepeatCount}
              onReorderUnit={handleReorderUnit}
            />
            {renderAuxiliaryJudgment()}
          </Suspense>
        );
      }

      case 'rsip':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <RSIPView
              nodes={state.rsipNodes}
              meta={state.rsipMeta}
              onBack={handleBackToDashboard}
              onSaveNodes={saveRSIPNodes}
              onSaveMeta={saveRSIPMeta}
            />
          </Suspense>
        );

      default:
        return (
          <>
            <Dashboard
              chains={state.chains}
              chainsRevision={state.chainsRevision}
              scheduledSessions={state.scheduledSessions}
              isLoading={isLoadingData}
              onCreateChain={handleCreateChain}
              onCreateTaskGroup={handleCreateTaskGroup}
              onOpenRSIP={openRSIP}
              onStartChain={handleStartChain}
              onScheduleChain={handleScheduleChain}
              onViewChainDetail={handleViewChainDetail}
              onCancelScheduledSession={handleCancelScheduledSession}
              onCompleteBooking={handleCompleteBooking}
              onDeleteChain={handleDeleteChain}
              onImportChains={handleImportChains}
              onRestoreChains={handleRestoreChains}
              onPermanentDeleteChains={handlePermanentDeleteChains}
              history={state.completionHistory}
              rsipNodes={state.rsipNodes}
              rsipMeta={state.rsipMeta}
            />
            {renderAuxiliaryJudgment()}
          </>
        );
    }
  };

  return (
    <>
      <a
        href="#main"
        onClick={() => document.getElementById('main')?.focus()}
        className="focus-ring sr-only z-[200] rounded-xl bg-white/95 px-4 py-2 text-sm font-medium text-gray-900 shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 dark:bg-slate-900/90 dark:text-slate-100"
      >
        {tr('跳转到主要内容', 'Skip to main content')}
      </a>

      <main id="main" tabIndex={-1}>
        {renderCurrentView()}
      </main>

      <Suspense fallback={null}>
        <PetWidget
          pet={petDomain.pet}
          mood={petDomain.mood}
          isLoading={petDomain.isLoading}
          hasPet={petDomain.hasPet}
          onCreatePet={petDomain.createPet}
          onFeedPet={petDomain.feedPet}
          onUpdatePosition={petDomain.updatePosition}
          onUpdateMinimizedPosition={petDomain.updateMinimizedPosition}
          onToggleVisibility={petDomain.toggleVisibility}
          onMinimize={petDomain.minimize}
          onExpand={petDomain.expand}
        />
      </Suspense>

      {showBettingModal && pendingChainId && currentSessionId && (
        <Suspense fallback={null}>
          <BettingModal
            isOpen={showBettingModal}
            onClose={handleBetCancelled}
            onBetPlaced={handleBetPlaced}
            sessionId={currentSessionId}
            chainName={
              state.chains.find((c) => c.id === pendingChainId)?.name ||
              tr('未知任务', 'Unknown Task')
            }
            taskDuration={
              state.chains.find((c) => c.id === pendingChainId)?.duration || 0
            }
          />
        </Suspense>
      )}
    </>
  );
}
