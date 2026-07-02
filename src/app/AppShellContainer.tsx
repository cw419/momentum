import { useCallback } from 'react';
import type { AppState, ViewState } from '../types';
import { useStorage } from '../storage/useStorage';
import { useSafeSaveChains } from '../hooks/domains/useSafeSaveChains';
import { useChainsDomain } from '../hooks/domains/useChainsDomain';
import { useSessionsDomain } from '../hooks/domains/useSessionsDomain';
import { useBettingDomain } from '../hooks/domains/useBettingDomain';
import { useRulesDomain } from '../hooks/domains/useRulesDomain';
import { useRecycleBinDomain } from '../hooks/domains/useRecycleBinDomain';
import { useRsipDomain } from '../hooks/domains/useRsipDomain';
import { useImportExportDomain } from '../hooks/domains/useImportExportDomain';
import { useGroupDomain } from '../hooks/domains/useGroupDomain';
import { usePetDomain } from '../hooks/domains/usePetDomain';
import { useAppDataLoad } from './hooks/useAppDataLoad';
import { useAuthController } from './hooks/useAuthController';
import { useServiceLifecycle } from './hooks/useServiceLifecycle';
import { useViewValidation } from './hooks/useViewValidation';
import { useViewUrlSync } from './hooks/useViewUrlSync';
import { usePeriodicCleanup } from './hooks/usePeriodicCleanup';
import { AppShellView } from './AppShellView';
import {
  buildAppViewModel,
  buildDashboardViewModel,
  buildPetViewModel,
  buildRsipViewModel,
  buildSessionViewModel,
} from './app-shell/viewModelBuilders';
import { useShallow } from 'zustand/react/shallow';
import {
  appShellStore,
  createInitialAppState,
  getAppStateSnapshot,
  useAppShellStore,
} from '../stores/appShellStore';

export default function AppShellContainer() {
  const storage = useStorage();
  const safelySaveChains = useSafeSaveChains(storage);
  const { chains, chainsRevision, scheduledSessions, activeSession, completionHistory } =
    useAppShellStore(
      useShallow((s) => ({
        chains: s.chains,
        chainsRevision: s.chainsRevision,
        scheduledSessions: s.scheduledSessions,
        activeSession: s.activeSession,
        completionHistory: s.completionHistory,
      })),
    );

  const { rsipNodes, rsipMeta, rsipGroups, rsipPolicyLibrary, rsipRunHistory, rsipTaskLinks, rsipExecutionRecords } =
    useAppShellStore(
      useShallow((s) => ({
        rsipNodes: s.rsipNodes,
        rsipMeta: s.rsipMeta,
        rsipGroups: s.rsipGroups,
        rsipPolicyLibrary: s.rsipPolicyLibrary,
        rsipRunHistory: s.rsipRunHistory,
        rsipTaskLinks: s.rsipTaskLinks,
        rsipExecutionRecords: s.rsipExecutionRecords,
      })),
    );

  const { currentView, editingChainId, viewingChainId, showAuxiliaryJudgment, showBettingModal, pendingChainId, currentSessionId, activeSessionId } =
    useAppShellStore(
      useShallow((s) => ({
        currentView: s.currentView,
        editingChainId: s.editingChainId,
        viewingChainId: s.viewingChainId,
        showAuxiliaryJudgment: s.showAuxiliaryJudgment,
        showBettingModal: s.showBettingModal,
        pendingChainId: s.pendingChainId,
        currentSessionId: s.currentSessionId,
        activeSessionId: s.activeSessionId,
      })),
    );

  const resetAppState = useCallback(() => createInitialAppState(), []);
  const resetUIState = useCallback(() => {
    appShellStore.getState().resetNavigationState();
  }, []);
  const setState = useCallback(
    (update: AppState | ((prev: AppState) => AppState)) => {
      appShellStore.getState().updateAppState(update);
    },
    [],
  );

  const { isInitialized } = useServiceLifecycle();

  useAuthController({
    storage,
    resetAppState,
    setState,
    resetUIState,
  });

  const shouldLoadData = isInitialized;
  const { isLoadingData } = useAppDataLoad({
    storage,
    isInitialized: shouldLoadData,
    setState,
  });

  useViewValidation({
    chains,
    activeSession,
    isInitialized,
  });
  useViewUrlSync({
    chains,
    activeSession,
    shouldLoadData,
    isLoadingData,
  });

  usePeriodicCleanup({
    getState: getAppStateSnapshot,
    setState,
    storage,
    isInitialized,
  });

  const {
    handleCreateChain,
    handleCreateTaskGroup,
    handleEditChain,
    handleSaveChain,
  } = useChainsDomain({
    getState: getAppStateSnapshot,
    setState,
    editingChainId,
    storage,
    safelySaveChains,
    onNavigateToEditor: (parentId) => {
      appShellStore.setState({
        currentView: 'editor',
        editingChainId: null,
        viewingChainId: parentId,
      });
    },
    onNavigateToTaskGroupEditor: () => {
      appShellStore.setState({
        currentView: 'taskgroup-editor',
        editingChainId: null,
      });
    },
    onEditChain: (chain, isTaskGroup) => {
      appShellStore.setState({
        currentView: isTaskGroup ? 'taskgroup-editor' : 'editor',
        editingChainId: chain.id,
      });
    },
    onNavigateToDashboard: () => {
      appShellStore.getState().navigateToDashboard();
    },
  });

  const {
    openRSIP,
    saveNodes: saveRSIPNodes,
    saveMeta: saveRSIPMeta,
    saveGroups: saveRSIPGroups,
    saveTaskLinks: saveRSIPTaskLinks,
    markExecuted: markRSIPExecuted,
    markViolated: markRSIPViolated,
    reinforceNode: reinforceRSIPNode,
    restoreFromLibrary: restoreRSIPFromLibrary,
    createGroup: createRSIPGroup,
    upsertTaskLinks: upsertRSIPTaskLinks,
    getRsipTaskActions,
    handleTaskEventIntegration,
  } = useRsipDomain({
    setState,
    storage,
    getState: getAppStateSnapshot,
    onNavigateToRSIP: () => {
      appShellStore.getState().navigateToView('rsip');
    },
  });

  const petDomain = usePetDomain();

  const {
    handleScheduleChain,
    handleStartChain,
    handleCompleteSession,
    handleInterruptSession,
    handlePauseSession,
    handleResumeSession,
    handleCancelScheduledSession,
    handleCompleteBooking,
  } = useSessionsDomain({
    getState: getAppStateSnapshot,
    setState,
    storage,
    safelySaveChains,
    activeSessionId,
    setActiveSessionId: (sessionId) =>
      appShellStore.getState().setActiveSessionId(sessionId),
    pendingChainId,
    setPendingChainId: (chainId) =>
      appShellStore.getState().setPendingChainId(chainId),
    currentSessionId,
    setCurrentSessionId: (sessionId) =>
      appShellStore.getState().setCurrentSessionId(sessionId),
    setShowBettingModal: (isOpen) =>
      appShellStore.getState().setShowBettingModal(isOpen),
    setShowAuxiliaryJudgment: (chainId) =>
      appShellStore.getState().setShowAuxiliaryJudgment(chainId),
    onNavigateToFocus: () => {
      appShellStore.getState().navigateToView('focus');
    },
    onNavigateToDashboard: () => {
      appShellStore.getState().navigateToDashboard();
    },
    onPetTaskCompleted: petDomain.onTaskCompleted,
    onRsipTaskEvent: async (payload) => {
      await handleTaskEventIntegration(payload);
    },
  });

  const { handleBetPlaced, handleBetCancelled } = useBettingDomain({
    pendingChainId,
    setPendingChainId: (chainId) =>
      appShellStore.getState().setPendingChainId(chainId),
    currentSessionId,
    setCurrentSessionId: (sessionId) =>
      appShellStore.getState().setCurrentSessionId(sessionId),
    setActiveSessionId: (sessionId) =>
      appShellStore.getState().setActiveSessionId(sessionId),
    setShowBettingModal: (isOpen) =>
      appShellStore.getState().setShowBettingModal(isOpen),
    handleStartChain,
  });

  const { handleAuxiliaryJudgmentFailure, handleAuxiliaryJudgmentAllow } =
    useRulesDomain({
      getState: getAppStateSnapshot,
      setState,
      storage,
      safelySaveChains,
      setShowAuxiliaryJudgment: (chainId) =>
        appShellStore.getState().setShowAuxiliaryJudgment(chainId),
    });

  const {
    handleDeleteChain,
    handleRestoreChains,
    handlePermanentDeleteChains,
  } = useRecycleBinDomain({
    getState: getAppStateSnapshot,
    setState,
    storage,
    onChainDeleted: (chainId, hasActiveSession) => {
      const uiState = appShellStore.getState();
      if (!hasActiveSession) {
        uiState.navigateToDashboard();
        return;
      }

      if (uiState.viewingChainId === chainId) {
        uiState.setViewingChainId(null);
      }
      if (uiState.editingChainId === chainId) {
        uiState.setEditingChainId(null);
      }
    },
  });

  const { handleImportChains } = useImportExportDomain({
    storage,
    safelySaveChains,
    setState,
  });

  const { handleImportUnits, handleUpdateTaskRepeatCount, handleReorderUnit } =
    useGroupDomain({
      getState: getAppStateSnapshot,
      setState,
      storage,
      safelySaveChains,
    });

  const handleViewChainDetail = (chainId: string) => {
    const chain = chains.find((c) => c.id === chainId);
    if (!chain) return;

    const viewType = chain.type === 'group' ? 'group' : 'detail';
    appShellStore.setState({
      currentView: viewType,
      viewingChainId: chainId,
      editingChainId: null,
    });
  };

  const handleBackToDashboard = () => {
    appShellStore.getState().navigateToDashboard();
  };

  const onNavigateToView = useCallback(
    (view: ViewState) => {
      if (view === 'dashboard') {
        appShellStore.getState().navigateToDashboard();
        return;
      }

      appShellStore.getState().navigateToView(view);
    },
    [],
  );

  const app = buildAppViewModel({
    isInitialized,
    isLoadingData,
    currentView,
    hasActiveSession: !!activeSession,
    onNavigateToView,
  });

  const dashboard = buildDashboardViewModel({
    currentView,
    chains,
    chainsRevision,
    scheduledSessions,
    editingChainId,
    viewingChainId,
    completionHistory,
    handleCreateChain,
    handleCreateTaskGroup,
    handleEditChain,
    handleSaveChain,
    handleViewChainDetail,
    handleBackToDashboard,
    openRSIP,
    handleScheduleChain,
    handleStartChain,
    handleCancelScheduledSession,
    handleCompleteBooking,
    handleDeleteChain,
    handleRestoreChains,
    handlePermanentDeleteChains,
    handleImportChains,
    handleImportUnits,
    handleUpdateTaskRepeatCount,
    handleReorderUnit,
  });

  const rsip = buildRsipViewModel({
    nodes: rsipNodes,
    meta: rsipMeta,
    groups: rsipGroups ?? [],
    policyLibrary: rsipPolicyLibrary ?? [],
    runHistory: rsipRunHistory ?? [],
    executionRecords: rsipExecutionRecords ?? [],
    taskLinks: rsipTaskLinks ?? [],
    chains,
    onBack: handleBackToDashboard,
    saveNodes: saveRSIPNodes,
    saveMeta: saveRSIPMeta,
    saveGroups: saveRSIPGroups,
    saveTaskLinks: saveRSIPTaskLinks,
    markExecuted: markRSIPExecuted,
    markViolated: markRSIPViolated,
    reinforceNode: reinforceRSIPNode,
    restoreFromLibrary: restoreRSIPFromLibrary,
    createGroup: createRSIPGroup,
    upsertTaskLinks: upsertRSIPTaskLinks,
    getTaskActions: getRsipTaskActions,
    handleStartChain,
    handleScheduleChain,
  });

  const session = buildSessionViewModel({
    chains,
    activeSession,
    showAuxiliaryJudgment,
    clearAuxiliaryJudgment: () =>
      appShellStore.getState().setShowAuxiliaryJudgment(null),
    showBettingModal,
    pendingChainId,
    currentSessionId,
    handleCompleteSession,
    handleInterruptSession,
    handlePauseSession,
    handleResumeSession,
    handleBetPlaced,
    handleBetCancelled,
    handleAuxiliaryJudgmentFailure,
    handleAuxiliaryJudgmentAllow,
  });

  const pet = buildPetViewModel(petDomain);

  return (
    <AppShellView
      app={app}
      dashboard={dashboard}
      rsip={rsip}
      session={session}
      pet={pet}
    />
  );
}
