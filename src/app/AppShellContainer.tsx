import { useCallback, useState } from 'react';
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
import {
  selectActiveSessionId,
  selectCurrentSessionId,
  selectCurrentView,
  selectEditingChain,
  selectPendingChainId,
  selectShowAuxiliaryJudgment,
  selectShowBettingModal,
  selectViewingChainId,
  uiStore,
  useUIStore,
} from '../stores/uiStore';

function createInitialAppState(): AppState {
  return {
    chains: [],
    chainsRevision: 0,
    scheduledSessions: [],
    activeSession: null,
    completionHistory: [],
    rsipNodes: [],
    rsipMeta: {},
    rsipGroups: [],
    rsipPolicyLibrary: [],
    rsipRunHistory: [],
    rsipTaskLinks: [],
    rsipExecutionRecords: [],
    taskTimeStats: [],
    exceptionRules: [],
    ruleUsageRecords: [],
  };
}

export default function AppShellContainer() {
  const [state, setState] = useState<AppState>(() => createInitialAppState());

  const storage = useStorage();
  const safelySaveChains = useSafeSaveChains(storage);
  const currentView = useUIStore(selectCurrentView);
  const editingChain = useUIStore(selectEditingChain);
  const viewingChainId = useUIStore(selectViewingChainId);
  const showAuxiliaryJudgment = useUIStore(selectShowAuxiliaryJudgment);
  const showBettingModal = useUIStore(selectShowBettingModal);
  const pendingChainId = useUIStore(selectPendingChainId);
  const currentSessionId = useUIStore(selectCurrentSessionId);
  const activeSessionId = useUIStore(selectActiveSessionId);

  const resetAppState = useCallback(() => createInitialAppState(), []);
  const resetUIState = useCallback(() => {
    uiStore.getState().resetAllUI();
  }, []);

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
    chains: state.chains,
    activeSession: state.activeSession,
    isInitialized,
  });
  useViewUrlSync({
    chains: state.chains,
    activeSession: state.activeSession,
    shouldLoadData,
    isLoadingData,
  });

  usePeriodicCleanup({
    state,
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
    state,
    setState,
    editingChain,
    storage,
    safelySaveChains,
    onNavigateToEditor: (parentId) => {
      uiStore.setState({
        currentView: 'editor',
        editingChain: null,
        viewingChainId: parentId,
      });
    },
    onNavigateToTaskGroupEditor: () => {
      uiStore.setState({
        currentView: 'taskgroup-editor',
        editingChain: null,
      });
    },
    onEditChain: (chain, isTaskGroup) => {
      uiStore.setState({
        currentView: isTaskGroup ? 'taskgroup-editor' : 'editor',
        editingChain: chain,
      });
    },
    onNavigateToDashboard: () => {
      uiStore.getState().navigateToDashboard();
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
    getState: () => state,
    onNavigateToRSIP: () => {
      uiStore.getState().navigateToView('rsip');
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
    state,
    setState,
    storage,
    safelySaveChains,
    activeSessionId,
    setActiveSessionId: (sessionId) =>
      uiStore.getState().setActiveSessionId(sessionId),
    pendingChainId,
    setPendingChainId: (chainId) => uiStore.getState().setPendingChainId(chainId),
    currentSessionId,
    setCurrentSessionId: (sessionId) =>
      uiStore.getState().setCurrentSessionId(sessionId),
    setShowBettingModal: (isOpen) =>
      uiStore.getState().setShowBettingModal(isOpen),
    setShowAuxiliaryJudgment: (chainId) =>
      uiStore.getState().setShowAuxiliaryJudgment(chainId),
    onNavigateToFocus: () => {
      uiStore.getState().navigateToView('focus');
    },
    onNavigateToDashboard: () => {
      uiStore.getState().navigateToDashboard();
    },
    onPetTaskCompleted: petDomain.onTaskCompleted,
    onRsipTaskEvent: async (payload) => {
      await handleTaskEventIntegration(payload);
    },
  });

  const { handleBetPlaced, handleBetCancelled } = useBettingDomain({
    pendingChainId,
    setPendingChainId: (chainId) => uiStore.getState().setPendingChainId(chainId),
    currentSessionId,
    setCurrentSessionId: (sessionId) =>
      uiStore.getState().setCurrentSessionId(sessionId),
    setActiveSessionId: (sessionId) =>
      uiStore.getState().setActiveSessionId(sessionId),
    setShowBettingModal: (isOpen) =>
      uiStore.getState().setShowBettingModal(isOpen),
    handleStartChain,
  });

  const { handleAuxiliaryJudgmentFailure, handleAuxiliaryJudgmentAllow } =
    useRulesDomain({
      state,
      setState,
      storage,
      safelySaveChains,
      setShowAuxiliaryJudgment: (chainId) =>
        uiStore.getState().setShowAuxiliaryJudgment(chainId),
    });

  const {
    handleDeleteChain,
    handleRestoreChains,
    handlePermanentDeleteChains,
  } = useRecycleBinDomain({
    state,
    setState,
    storage,
    onChainDeleted: (chainId, hasActiveSession) => {
      const uiState = uiStore.getState();
      if (!hasActiveSession) {
        uiState.navigateToDashboard();
        return;
      }

      if (uiState.viewingChainId === chainId) {
        uiState.setViewingChainId(null);
      }
      if (uiState.editingChain?.id === chainId) {
        uiState.setEditingChain(null);
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
      state,
      setState,
      storage,
      safelySaveChains,
    });

  const handleViewChainDetail = (chainId: string) => {
    const chain = state.chains.find((c) => c.id === chainId);
    if (!chain) return;

    const viewType = chain.type === 'group' ? 'group' : 'detail';
    uiStore.setState({
      currentView: viewType,
      viewingChainId: chainId,
      editingChain: null,
    });
  };

  const handleBackToDashboard = () => {
    uiStore.getState().navigateToDashboard();
  };

  const onNavigateToView = useCallback(
    (view: ViewState) => {
      if (view === 'dashboard') {
        uiStore.getState().navigateToDashboard();
        return;
      }

      uiStore.getState().navigateToView(view);
    },
    [],
  );

  const app = buildAppViewModel({
    isInitialized,
    isLoadingData,
    currentView,
    hasActiveSession: !!state.activeSession,
    onNavigateToView,
  });

  const dashboard = buildDashboardViewModel({
    currentView,
    chains: state.chains,
    chainsRevision: state.chainsRevision,
    scheduledSessions: state.scheduledSessions,
    editingChain,
    viewingChainId,
    completionHistory: state.completionHistory,
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
    nodes: state.rsipNodes,
    meta: state.rsipMeta,
    groups: state.rsipGroups ?? [],
    policyLibrary: state.rsipPolicyLibrary ?? [],
    runHistory: state.rsipRunHistory ?? [],
    executionRecords: state.rsipExecutionRecords ?? [],
    taskLinks: state.rsipTaskLinks ?? [],
    chains: state.chains,
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
    chains: state.chains,
    activeSession: state.activeSession,
    showAuxiliaryJudgment,
    clearAuxiliaryJudgment: () =>
      uiStore.getState().setShowAuxiliaryJudgment(null),
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
