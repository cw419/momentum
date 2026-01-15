import { useEffect, useRef, useState } from 'react';
import type { AppState } from '../types';
import { useStorage } from '../storage/useStorage';
import { isDev } from '../utils/env';
import { logger } from '../utils/logger';
import { toError } from '../utils/errorHandling';
import { isSessionExpired } from '../utils/time';
import { notificationManager } from '../utils/notifications';
import { performanceDashboard } from '../utils/performanceDashboard';
import { isGroupExpired, resetGroupProgress } from '../utils/timeLimit';
import { initializeRuleSystem } from '../utils/initializeRuleSystem';
import { runMigration } from '../utils/migration';
import { soundManager } from '../utils/soundManager';
import { forwardTimerManager } from '../utils/forwardTimer';
import { exceptionRuleCache } from '../utils/exceptionRuleCache';
import { performanceMonitor } from '../utils/performanceMonitor';
import { ruleStateManager } from '../services/RuleStateManager';
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
import { AppShellView } from './AppShellView';

function createInitialAppState(): AppState {
  return {
    chains: [],
    scheduledSessions: [],
    activeSession: null,
    currentView: 'dashboard',
    editingChain: null,
    viewingChainId: null,
    completionHistory: [],
    rsipNodes: [],
    rsipMeta: {},
    taskTimeStats: [],
    exceptionRules: [],
    ruleUsageRecords: [],
  };
}

export default function AppShellContainer() {
  const [state, setState] = useState<AppState>(() => createInitialAppState());

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [showAuxiliaryJudgment, setShowAuxiliaryJudgment] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 押注相关状态
  const [showBettingModal, setShowBettingModal] = useState(false);
  const [pendingChainId, setPendingChainId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null); // 跟踪数据库中的活动session UUID

  const storage = useStorage();
  const safelySaveChains = useSafeSaveChains(storage);

  // When using Supabase storage, defer initial data load until the user is authenticated.
  // Otherwise the first load (unauthenticated) will cache empty data and never refresh until a full reload.
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const prevAuthUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (storage.kind !== 'supabase') {
      setAuthUserId(null);
      prevAuthUserIdRef.current = null;
      return;
    }

    const unsubscribeResult = storage.onAuthStateChange((event, session) => {
      const nextUserId = session.user?.id ?? null;
      setAuthUserId(nextUserId);

      const prevUserId = prevAuthUserIdRef.current;
      if (prevUserId !== nextUserId) {
        prevAuthUserIdRef.current = nextUserId;
        logger.debug('APP_SHELL', 'Auth user changed', { event, prevUserId, nextUserId });
        setState(createInitialAppState());
      }
    });

    if (!unsubscribeResult.ok) {
      logger.warn(
        'APP_SHELL',
        'Failed to subscribe to auth state changes',
        { message: unsubscribeResult.error.message },
        toError(unsubscribeResult.error)
      );
      return;
    }

    return () => unsubscribeResult.value();
  }, [storage]);

  useEffect(() => {
    // 立即设置初始化完成，让首屏尽快渲染
    setIsInitialized(true);

    // Start global timers/listeners explicitly (and stop on unmount)
    forwardTimerManager.start();
    exceptionRuleCache.start();
    ruleStateManager.start();
    if (isDev) {
      performanceDashboard.start();
      performanceMonitor.start();
    }

    // 延迟执行非关键初始化，不阻塞首屏渲染
    const initializeNonCritical = () => {
      initializeRuleSystem()
        .then(result => {
          if (!result.success) {
            logger.error('APP_SHELL', `Rule system initialization failed: ${result.message}`);
          }
        })
        .catch(error => {
          logger.error('APP_SHELL', 'Rule system initialization error', undefined, toError(error));
        });

      runMigration();

      if (isDev) {
        setTimeout(() => {
          performanceDashboard.displayConsoleReport();
        }, 5000);
      }
    };

    const requestIdleCallbackFn = window.requestIdleCallback;
    if (typeof requestIdleCallbackFn === 'function') {
      requestIdleCallbackFn((_deadline) => {
        void _deadline;
        initializeNonCritical();
      }, { timeout: 2000 });
    } else {
      setTimeout(initializeNonCritical, 100);
    }

    return () => {
      forwardTimerManager.stop();
      exceptionRuleCache.stop();
      ruleStateManager.stop();
      performanceDashboard.stop();
      performanceMonitor.stop();
    };
  }, []);

  const shouldLoadData = isInitialized && (storage.kind !== 'supabase' || Boolean(authUserId));
  const { isLoadingData } = useAppDataLoad({ storage, isInitialized: shouldLoadData, setState });

  useEffect(() => {
    if (state.currentView === 'focus') {
      const activeChain = state.chains.find(c => c.id === state.activeSession?.chainId);
      if (!state.activeSession || !activeChain) {
        setState(prev => ({ ...prev, currentView: 'dashboard', editingChain: null, viewingChainId: null }));
      }
    }
  }, [state.activeSession, state.chains, state.currentView]);

  useEffect(() => {
    if (state.currentView === 'detail' || state.currentView === 'group') {
      const viewingChain = state.chains.find(c => c.id === state.viewingChainId);
      if (!viewingChain) {
        setState(prev => ({ ...prev, currentView: 'dashboard', editingChain: null, viewingChainId: null }));
      }
    }
  }, [state.chains, state.currentView, state.viewingChainId]);

  // 定期检查任务群过期状态
  useEffect(() => {
    if (!isInitialized) return;

    const checkExpiredGroups = () => {
      const current = stateRef.current;
      let hasChanges = false;

      const updatedChains = current.chains.map(chain => {
        if (chain.type === 'group' && isGroupExpired(chain)) {
          hasChanges = true;
          return resetGroupProgress(chain);
        }
        return chain;
      });

      if (!hasChanges) return;

      void storage.saveChains(updatedChains).catch(error => {
        logger.error('APP_SHELL', 'Failed to persist group expiry cleanup', undefined, toError(error));
      });

      setState(prev => ({ ...prev, chains: updatedChains }));
    };

    const interval = setInterval(checkExpiredGroups, 60000);
    return () => clearInterval(interval);
  }, [storage, isInitialized]);

  // Clean up expired scheduled sessions periodically
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      const current = stateRef.current;

      const expiredSessions = current.scheduledSessions.filter(session => isSessionExpired(session.expiresAt));
      if (expiredSessions.length === 0) return;

      const activeScheduledSessions = current.scheduledSessions.filter(session => !isSessionExpired(session.expiresAt));

      soundManager.playTimerFinished();

      expiredSessions.forEach(session => {
        const chain = current.chains.find(c => c.id === session.chainId);
        if (chain) {
          notificationManager.notifyScheduleFailed(chain.name);
        }
      });

      setShowAuxiliaryJudgment(expiredSessions[0].chainId);

      void storage.saveScheduledSessions(activeScheduledSessions).catch(error => {
        logger.error('APP_SHELL', 'Failed to persist scheduled session cleanup', undefined, toError(error));
      });

      setState(prev => ({ ...prev, scheduledSessions: activeScheduledSessions }));
    }, 10000);

    return () => clearInterval(interval);
  }, [storage, isInitialized]);

  const { handleCreateChain, handleCreateTaskGroup, handleEditChain, handleSaveChain } = useChainsDomain({
    state,
    setState,
    storage,
    safelySaveChains,
  });

  const { openRSIP, saveNodes: saveRSIPNodes, saveMeta: saveRSIPMeta } = useRsipDomain({ setState, storage });

  // Pet domain
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

  const { handleAuxiliaryJudgmentFailure, handleAuxiliaryJudgmentAllow } = useRulesDomain({
    state,
    setState,
    storage,
    safelySaveChains,
    setShowAuxiliaryJudgment,
  });

  const { handleDeleteChain, handleRestoreChains, handlePermanentDeleteChains } = useRecycleBinDomain({
    state,
    setState,
    storage,
  });

  const { handleImportChains } = useImportExportDomain({ storage, safelySaveChains, setState });
  const { handleImportUnits, handleUpdateTaskRepeatCount, handleReorderUnit } = useGroupDomain({
    state,
    setState,
    storage,
    safelySaveChains,
  });

  const handleViewChainDetail = (chainId: string) => {
    const chain = state.chains.find(c => c.id === chainId);
    if (!chain) return;

    const viewType = chain.type === 'group' ? 'group' : 'detail';
    setState(prev => ({
      ...prev,
      currentView: viewType,
      viewingChainId: chainId,
    }));
  };

  const handleBackToDashboard = () => {
    setState(prev => ({
      ...prev,
      currentView: 'dashboard',
      editingChain: null,
      viewingChainId: null,
    }));
  };

  return (
    <AppShellView
      storageKind={storage.kind}
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

