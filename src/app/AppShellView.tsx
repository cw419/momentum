import { Suspense, lazy } from 'react';
import type { Chain, ChainDraft, CompletionHistory, RSIPMeta, RSIPNode } from '../types';
import type { AppState } from '../types';
import type { BetPlacementResult } from '../domain/betting';
import { Dashboard } from '../components/Dashboard';
import { AuthWrapper } from '../components/AuthWrapper';
import { queryOptimizer } from '../utils/queryOptimizer';
import { useI18n } from '../i18n';

// 非首屏组件 - 懒加载以优化首屏性能
const RSIPView = lazy(() => import('../components/RSIPView').then(m => ({ default: m.RSIPView })));
const ChainEditor = lazy(() => import('../components/ChainEditor').then(m => ({ default: m.ChainEditor })));
const FocusMode = lazy(() => import('../components/FocusMode').then(m => ({ default: m.FocusMode })));
const ChainDetail = lazy(() => import('../components/ChainDetail').then(m => ({ default: m.ChainDetail })));
const GroupView = lazy(() => import('../components/GroupView').then(m => ({ default: m.GroupView })));
const TaskGroupEditor = lazy(() => import('../components/TaskGroupEditor').then(m => ({ default: m.TaskGroupEditor })));
const AuxiliaryJudgment = lazy(() =>
  import('../components/AuxiliaryJudgment').then(m => ({ default: m.AuxiliaryJudgment }))
);
const BettingModal = lazy(() => import('../components/BettingModal').then(m => ({ default: m.BettingModal })));

// 加载状态组件
const LoadingFallback = () => {
  const { tr } = useI18n();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-500 dark:text-slate-400 text-sm">{tr('加载中…', 'Loading…')}</p>
      </div>
    </div>
  );
};

interface ImportChainsOptions {
  history?: CompletionHistory[];
  rsipNodes?: RSIPNode[];
  rsipMeta?: RSIPMeta;
  exceptionRules?: unknown[];
}

interface AppShellViewProps {
  storageKind: 'local' | 'supabase';
  state: AppState;
  isInitialized: boolean;
  isLoadingData: boolean;

  showAuxiliaryJudgment: string | null;
  setShowAuxiliaryJudgment: (chainId: string | null) => void;

  showBettingModal: boolean;
  pendingChainId: string | null;
  currentSessionId: string | null;

  handleCreateChain: (parentId?: string | null) => void;
  handleCreateTaskGroup: () => void;
  handleEditChain: (chainId: string) => void;
  handleSaveChain: (chainData: ChainDraft, isCopy?: boolean) => void;

  handleViewChainDetail: (chainId: string) => void;
  handleBackToDashboard: () => void;

  openRSIP: () => void;
  saveRSIPNodes: (nodes: RSIPNode[]) => void;
  saveRSIPMeta: (meta: RSIPMeta) => void;

  handleScheduleChain: (chainId: string) => void;
  handleStartChain: (chainId: string) => Promise<void>;
  handleCancelScheduledSession: (chainId: string) => void;
  handleCompleteBooking: (chainId: string) => void;

  handleCompleteSession: (description?: string, notes?: string) => void;
  handleInterruptSession: (reason?: string) => void;
  handlePauseSession: () => void;
  handleResumeSession: () => void;

  handleDeleteChain: (chainId: string) => Promise<void>;
  handleRestoreChains: (chainIds: string[]) => Promise<void>;
  handlePermanentDeleteChains: (chainIds: string[]) => Promise<void>;

  handleAuxiliaryJudgmentFailure: (chainId: string) => void;
  handleAuxiliaryJudgmentAllow: (chainId: string, exceptionRule: string) => void;

  handleImportChains: (importedChains: Chain[], options?: ImportChainsOptions) => Promise<void>;
  handleImportUnits: (unitIds: string[], groupId: string, mode?: 'move' | 'copy') => Promise<void>;
  handleUpdateTaskRepeatCount: (chainId: string, repeatCount: number) => Promise<void>;
  handleReorderUnit: (groupId: string, unitId: string, direction: 'up' | 'down') => Promise<void>;

  handleBetPlaced: (betResult: BetPlacementResult) => Promise<void>;
  handleBetCancelled: () => Promise<void>;
}

export function AppShellView({
  storageKind,
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
}: AppShellViewProps) {
  const { tr } = useI18n();
  const renderAuxiliaryJudgment = () => {
    if (!showAuxiliaryJudgment) return null;

    return (
      <Suspense fallback={null}>
        <AuxiliaryJudgment
          chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
          onJudgmentFailure={() => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment)}
          onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
          onCancel={() => setShowAuxiliaryJudgment(null)}
        />
      </Suspense>
    );
  };

  const renderCurrentView = () => {
    if (!isInitialized) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-xl">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-2">
              {tr('正在初始化…', 'Initializing…')}
            </h2>
            <p className="text-gray-600 dark:text-slate-400 font-mono text-sm">
              {tr('正在初始化应用', 'INITIALIZING APPLICATION')}
            </p>
          </div>
        </div>
      );
    }

    switch (state.currentView) {
      case 'editor':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ChainEditor
              chain={state.editingChain || undefined}
              isEditing={!!state.editingChain}
              initialParentId={state.viewingChainId || undefined}
              onSave={handleSaveChain}
              onCancel={handleBackToDashboard}
            />
            {renderAuxiliaryJudgment()}
          </Suspense>
        );

      case 'taskgroup-editor':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <TaskGroupEditor
              chain={state.editingChain || undefined}
              isEditing={!!state.editingChain}
              initialParentId={state.viewingChainId || undefined}
              onSave={handleSaveChain}
              onCancel={handleBackToDashboard}
            />
          </Suspense>
        );

      case 'focus': {
        const activeChain = state.chains.find(c => c.id === state.activeSession?.chainId);
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
        const viewingChain = state.chains.find(c => c.id === state.viewingChainId);
        if (!viewingChain) return null;

        return (
          <Suspense fallback={<LoadingFallback />}>
            <ChainDetail
              chain={viewingChain}
              history={state.completionHistory}
              onBack={handleBackToDashboard}
              onEdit={() => handleEditChain(viewingChain.id)}
              onDelete={() => handleDeleteChain(viewingChain.id)}
            />
            {renderAuxiliaryJudgment()}
          </Suspense>
        );
      }

      case 'group': {
        const viewingGroup = state.chains.find(c => c.id === state.viewingChainId);
        if (!viewingGroup) return null;

        const chainTree = queryOptimizer.memoizedBuildChainTree(state.chains);
        const groupNode = chainTree.find(node => node.id === state.viewingChainId);
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

  const content = storageKind !== 'supabase' ? (
    renderCurrentView()
  ) : (
    <AuthWrapper>{renderCurrentView()}</AuthWrapper>
  );

  return (
    <>
      {content}

      {/* Betting Modal - 懒加载 */}
      {showBettingModal && pendingChainId && currentSessionId && (
        <Suspense fallback={null}>
          <BettingModal
            isOpen={showBettingModal}
            onClose={handleBetCancelled}
            onBetPlaced={handleBetPlaced}
            sessionId={currentSessionId}
            chainName={state.chains.find(c => c.id === pendingChainId)?.name || tr('未知任务', 'Unknown Task')}
            taskDuration={state.chains.find(c => c.id === pendingChainId)?.duration || 0}
          />
        </Suspense>
      )}
    </>
  );
}

