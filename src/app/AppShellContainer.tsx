import { useCallback, useRef, useState } from 'react';
import type { AppState } from '../types';
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

function createInitialAppState(): AppState {
  return {
    chains: [],
    chainsRevision: 0,
    scheduledSessions: [],
    activeSession: null,
    currentView: 'dashboard',
    editingChain: null,
    viewingChainId: null,
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
  const stateRef = useRef(state);
  stateRef.current = state;

  const [showAuxiliaryJudgment, setShowAuxiliaryJudgment] = useState<
    string | null
  >(null);
  const [showBettingModal, setShowBettingModal] = useState(false);
  const [pendingChainId, setPendingChainId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const storage = useStorage();
  const safelySaveChains = useSafeSaveChains(storage);

  const resetAppState = useCallback(() => createInitialAppState(), []);

  const { isInitialized } = useServiceLifecycle();

  useAuthController({
    storage,
    resetAppState,
    setState,
  });

  const shouldLoadData = isInitialized;
  const { isLoadingData } = useAppDataLoad({
    storage,
    isInitialized: shouldLoadData,
    setState,
  });

  useViewValidation({ state, setState, isInitialized });
  useViewUrlSync({ state, setState, shouldLoadData, isLoadingData });

  usePeriodicCleanup({
    state,
    setState,
    storage,
    isInitialized,
    setShowAuxiliaryJudgment,
  });

  const {
    handleCreateChain,
    handleCreateTaskGroup,
    handleEditChain,
    handleSaveChain,
  } = useChainsDomain({
    state,
    setState,
    storage,
    safelySaveChains,
  });

  const {
    openRSIP,
    saveNodes: saveRSIPNodes,
    saveMeta: saveRSIPMeta,
    saveGroups: saveRSIPGroups,
    savePolicyLibrary: saveRSIPPolicyLibrary,
    saveRunHistory: saveRSIPRunHistory,
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
    getState: () => stateRef.current,
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
    setActiveSessionId,
    pendingChainId,
    setPendingChainId,
    currentSessionId,
    setCurrentSessionId,
    setShowBettingModal,
    setShowAuxiliaryJudgment,
    onPetTaskCompleted: petDomain.onTaskCompleted,
    onRsipTaskEvent: async (payload) => {
      await handleTaskEventIntegration(payload);
    },
  });

  const { handleBetPlaced, handleBetCancelled } = useBettingDomain({
    pendingChainId,
    setPendingChainId,
    currentSessionId,
    setCurrentSessionId,
    setActiveSessionId,
    setShowBettingModal,
    handleStartChain,
  });

  const { handleAuxiliaryJudgmentFailure, handleAuxiliaryJudgmentAllow } =
    useRulesDomain({
      state,
      setState,
      storage,
      safelySaveChains,
      setShowAuxiliaryJudgment,
    });

  const {
    handleDeleteChain,
    handleRestoreChains,
    handlePermanentDeleteChains,
  } = useRecycleBinDomain({
    state,
    setState,
    storage,
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
    setState((prev) => ({
      ...prev,
      currentView: viewType,
      viewingChainId: chainId,
    }));
  };

  const handleBackToDashboard = () => {
    setState((prev) => ({
      ...prev,
      currentView: 'dashboard',
      editingChain: null,
      viewingChainId: null,
    }));
  };

  return (
    <AppShellView
      state={state}
      isInitialized={isInitialized}
      isLoadingData={isLoadingData}
      showAuxiliaryJudgment={showAuxiliaryJudgment}
      setShowAuxiliaryJudgment={setShowAuxiliaryJudgment}
      showBettingModal={showBettingModal}
      pendingChainId={pendingChainId}
      currentSessionId={currentSessionId}
      handleCreateChain={handleCreateChain}
      handleCreateTaskGroup={handleCreateTaskGroup}
      handleEditChain={handleEditChain}
      handleSaveChain={handleSaveChain}
      handleViewChainDetail={handleViewChainDetail}
      handleBackToDashboard={handleBackToDashboard}
      openRSIP={openRSIP}
      saveRSIPNodes={saveRSIPNodes}
      saveRSIPMeta={saveRSIPMeta}
      saveRSIPGroups={saveRSIPGroups}
      saveRSIPPolicyLibrary={saveRSIPPolicyLibrary}
      saveRSIPRunHistory={saveRSIPRunHistory}
      saveRSIPTaskLinks={saveRSIPTaskLinks}
      markRSIPExecuted={markRSIPExecuted}
      markRSIPViolated={markRSIPViolated}
      reinforceRSIPNode={reinforceRSIPNode}
      restoreRSIPFromLibrary={restoreRSIPFromLibrary}
      createRSIPGroup={createRSIPGroup}
      upsertRSIPTaskLinks={upsertRSIPTaskLinks}
      getRSIPTaskActions={getRsipTaskActions}
      handleScheduleChain={handleScheduleChain}
      handleStartChain={handleStartChain}
      handleCancelScheduledSession={handleCancelScheduledSession}
      handleCompleteBooking={handleCompleteBooking}
      handleCompleteSession={handleCompleteSession}
      handleInterruptSession={handleInterruptSession}
      handlePauseSession={handlePauseSession}
      handleResumeSession={handleResumeSession}
      handleDeleteChain={handleDeleteChain}
      handleRestoreChains={handleRestoreChains}
      handlePermanentDeleteChains={handlePermanentDeleteChains}
      handleAuxiliaryJudgmentFailure={handleAuxiliaryJudgmentFailure}
      handleAuxiliaryJudgmentAllow={handleAuxiliaryJudgmentAllow}
      handleImportChains={handleImportChains}
      handleImportUnits={handleImportUnits}
      handleUpdateTaskRepeatCount={handleUpdateTaskRepeatCount}
      handleReorderUnit={handleReorderUnit}
      handleBetPlaced={handleBetPlaced}
      handleBetCancelled={handleBetCancelled}
      petDomain={petDomain}
    />
  );
}
