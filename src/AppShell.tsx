import { useState, useEffect, Suspense, lazy } from 'react';
import { AppState, Chain, CompletionHistory, RSIPNode, RSIPMeta } from './types';

// 首屏关键组件 - 同步导入
import { Dashboard } from './components/Dashboard';
import { AuthWrapper } from './components/AuthWrapper';

// 非首屏组件 - 懒加载以优化首屏性能
const RSIPView = lazy(() => import('./components/RSIPView').then(m => ({ default: m.RSIPView })));
const ChainEditor = lazy(() => import('./components/ChainEditor').then(m => ({ default: m.ChainEditor })));
const FocusMode = lazy(() => import('./components/FocusMode').then(m => ({ default: m.FocusMode })));
const ChainDetail = lazy(() => import('./components/ChainDetail').then(m => ({ default: m.ChainDetail })));
const GroupView = lazy(() => import('./components/GroupView').then(m => ({ default: m.GroupView })));
const TaskGroupEditor = lazy(() => import('./components/TaskGroupEditor').then(m => ({ default: m.TaskGroupEditor })));
const AuxiliaryJudgment = lazy(() => import('./components/AuxiliaryJudgment').then(m => ({ default: m.AuxiliaryJudgment })));
const BettingModal = lazy(() => import('./components/BettingModal').then(m => ({ default: m.BettingModal })));

// 加载状态组件
const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
      <p className="text-gray-500 dark:text-slate-400 text-sm">加载中...</p>
    </div>
  </div>
);
import { useStorage } from './storage/StorageContext';
import { isSupabaseConfigured, isUserAuthenticated, waitForAuthentication } from './lib/supabase';
import { isSessionExpired } from './utils/time';
import { queryOptimizer } from './utils/queryOptimizer';
import { notificationManager } from './utils/notifications';
import { performanceDashboard } from './utils/performanceDashboard';
import { isGroupExpired, resetGroupProgress } from './utils/timeLimit';
import { initializeRuleSystem } from './utils/initializeRuleSystem';
import { runMigration } from './utils/migration';
import { soundManager } from './utils/soundManager';
import { useSafeSaveChains } from './hooks/domains/useSafeSaveChains';
import { useChainsDomain } from './hooks/domains/useChainsDomain';
import { useSessionsDomain } from './hooks/domains/useSessionsDomain';
import { useBettingDomain } from './hooks/domains/useBettingDomain';
import { useRulesDomain } from './hooks/domains/useRulesDomain';
import { useRecycleBinDomain } from './hooks/domains/useRecycleBinDomain';
import { useRsipDomain } from './hooks/domains/useRsipDomain';

function AppShell() {
  const [state, setState] = useState<AppState>({
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
  });

  const [showAuxiliaryJudgment, setShowAuxiliaryJudgment] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [recycleBinRefreshTrigger, setRecycleBinRefreshTrigger] = useState<number>(0);

  // 押注相关状态
  const [showBettingModal, setShowBettingModal] = useState(false);
  const [pendingChainId, setPendingChainId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null); // 跟踪数据库中的活动session UUID

  const storage = useStorage();
  const safelySaveChains = useSafeSaveChains(storage);

  useEffect(() => {
    // 立即设置初始化完成，让首屏尽快渲染
    setIsInitialized(true);

    // 延迟执行非关键初始化，不阻塞首屏渲染
    const initializeNonCritical = () => {
      // 初始化规则系统（非关键路径）
      initializeRuleSystem().then(result => {
        if (!result.success) {
          console.error('Rule system initialization failed:', result.message);
        }
      }).catch(error => {
        console.error('Rule system initialization error:', error);
      });

      // 运行迁移脚本（非关键路径）
      runMigration();

      // Initialize performance monitoring for development
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          performanceDashboard.displayConsoleReport();
        }, 5000);
      }
    };

    // 使用 requestIdleCallback 延迟非关键初始化
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(initializeNonCritical, { timeout: 2000 });
    } else {
      // 降级方案：使用 setTimeout
      setTimeout(initializeNonCritical, 100);
    }
  }, []);

  const renderContent = () => {
    if (!isSupabaseConfigured) {
      // 没有 Supabase 配置时，直接渲染内容，不需要认证
      return renderCurrentView();
    }
    
    // 有 Supabase 配置时，使用认证包装
    return (
      <AuthWrapper>
        {renderCurrentView()}
      </AuthWrapper>
    );
  };

  const renderCurrentView = () => {
    // 如果还没有初始化完成，显示加载状态
    if (!isInitialized) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-xl">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-2">
              正在初始化...
            </h2>
            <p className="text-gray-600 dark:text-slate-400 font-mono text-sm">
              INITIALIZING APPLICATION
            </p>
          </div>
        </div>
      );
    }

    // 使用 Suspense 包装懒加载组件
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
            {showAuxiliaryJudgment && (
              <AuxiliaryJudgment
                chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
                onJudgmentFailure={() => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment!)}
                onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
                onCancel={() => setShowAuxiliaryJudgment(null)}
              />
            )}
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
        if (!state.activeSession || !activeChain) {
          handleBackToDashboard();
          return null;
        }
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
            {showAuxiliaryJudgment && (
              <AuxiliaryJudgment
                chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
                onJudgmentFailure={() => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment!)}
                onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
                onCancel={() => setShowAuxiliaryJudgment(null)}
              />
            )}
          </Suspense>
        );
      }

      case 'detail': {
        const viewingChain = state.chains.find(c => c.id === state.viewingChainId);
        if (!viewingChain) {
          handleBackToDashboard();
          return null;
        }
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ChainDetail
              chain={viewingChain}
              history={state.completionHistory}
              onBack={handleBackToDashboard}
              onEdit={() => handleEditChain(viewingChain.id)}
              onDelete={() => handleDeleteChain(viewingChain.id)}
            />
            {showAuxiliaryJudgment && (
              <AuxiliaryJudgment
                chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
                onJudgmentFailure={() => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment!)}
                onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
                onCancel={() => setShowAuxiliaryJudgment(null)}
              />
            )}
          </Suspense>
        );
      }

      case 'group': {
        const viewingGroup = state.chains.find(c => c.id === state.viewingChainId);
        if (!viewingGroup) {
          handleBackToDashboard();
          return null;
        }

        // 构建任务树并找到对应的群组节点
        const chainTree = queryOptimizer.memoizedBuildChainTree(state.chains);
        const groupNode = chainTree.find(node => node.id === state.viewingChainId);
        if (!groupNode) {
          handleBackToDashboard();
          return null;
        }

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
              onReorderUnit={async (groupId, unitId, direction) => {
                // 计算相邻项并交换 sortOrder
                const chainTree = queryOptimizer.memoizedBuildChainTree(state.chains);
                const groupNode = chainTree.find(n => n.id === groupId);
                if (!groupNode) return;
                const idx = groupNode.children.findIndex(c => c.id === unitId);
                if (idx < 0) return;
                const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
                if (targetIdx < 0 || targetIdx >= groupNode.children.length) return;
                const a = groupNode.children[idx];
                const b = groupNode.children[targetIdx];
                const updated = state.chains.map(ch => {
                  if (ch.id === a.id) return { ...ch, sortOrder: b.sortOrder };
                  if (ch.id === b.id) return { ...ch, sortOrder: a.sortOrder };
                  return ch;
                });
                await safelySaveChains(updated);
                queryOptimizer.onDataChange('chains');
                setState(prev => ({ ...prev, chains: updated }));
              }}
            />
            {showAuxiliaryJudgment && (
              <AuxiliaryJudgment
                chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
                onJudgmentFailure={() => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment!)}
                onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
                onCancel={() => setShowAuxiliaryJudgment(null)}
              />
            )}
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
              recycleBinRefreshTrigger={recycleBinRefreshTrigger}
            />
            {showAuxiliaryJudgment && (
              <Suspense fallback={null}>
                <AuxiliaryJudgment
                  chain={state.chains.find(c => c.id === showAuxiliaryJudgment)!}
                  onJudgmentFailure={() => handleAuxiliaryJudgmentFailure(showAuxiliaryJudgment!)}
                  onJudgmentAllow={(exceptionRule) => handleAuxiliaryJudgmentAllow(showAuxiliaryJudgment, exceptionRule)}
                  onCancel={() => setShowAuxiliaryJudgment(null)}
                />
              </Suspense>
            )}
          </>
        );
    }
  };

  // Load data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      console.log('Starting data load, using storage type:', isSupabaseConfigured ? 'Supabase' : 'LocalStorage');
      setIsLoadingData(true);
      try {
        // 在加载数据前先执行自动清理
        try {
          const cleanedCount = await storage.cleanupExpiredDeletedChains(30);
          if (cleanedCount > 0) {
            console.log(`Auto-cleaned ${cleanedCount} expired deleted chains`);
          }
        } catch (cleanupError) {
          console.error('Auto cleanup failed:', cleanupError);
        }
        const chains = await storage.getActiveChains();
        
        // 检查并修复循环引用的数据
        const hasCircularReferences = chains.some(chain => chain.parentId === chain.id);
        if (hasCircularReferences) {
          console.log('Detected circular reference data, fixing...');
          const fixedChains = chains.map(chain => {
            if (chain.parentId === chain.id) {
              console.log(`Fixed circular reference for chain ${chain.name}`);
              return { ...chain, parentId: undefined };
            }
            return chain;
          });
          
          // 将修复后的数据保存回数据库
          await storage.saveChains(fixedChains);
          console.log('Circular reference data fix completed and saved');
          
          // 使用修复后的数据
          setState(prev => ({
            ...prev,
            chains: fixedChains,
            scheduledSessions: [],
            activeSession: null,
            completionHistory: [],
            currentView: 'dashboard',
          }));
          return;
        }
        
        console.log('Loaded chain data:', chains.length, 'items');
        console.log('Chain data details:', chains.map(c => ({ id: c.id, name: c.name })));
        const allScheduledSessions = await storage.getScheduledSessions();
        const scheduledSessions = allScheduledSessions.filter(
          session => !isSessionExpired(session.expiresAt)
        );
        const activeSession = await storage.getActiveSession();
        const completionHistory = await storage.getCompletionHistory();
        const rsipNodes = await storage.getRSIPNodes();
        const rsipMeta = await storage.getRSIPMeta();
        const taskTimeStats = await storage.getTaskTimeStats();

        // 执行数据迁移以确保历史记录包含用时信息
        storage.migrateCompletionHistoryForTiming();
        
        // 执行完整的数据迁移（仅在开发环境中记录详细信息）
        if (process.env.NODE_ENV === 'development') {
          try {
            const { dataMigrationManager } = await import('./utils/dataMigration');
            const migrationResult = await dataMigrationManager.migrateAll();
            if (!migrationResult.success || migrationResult.errors.length > 0) {
              console.warn('Data migration completed with warnings:', migrationResult);
            } else {
              console.log('Data migration completed successfully');
            }
          } catch (migrationError) {
            console.warn('Error occurred during data migration:', migrationError);
          }
        }

        console.log('Setting app state, chain count:', chains.length);
        setState(prev => ({
          ...prev,
          chains,
          scheduledSessions,
          activeSession,
          completionHistory,
          rsipNodes,
          rsipMeta,
          taskTimeStats,
          currentView: activeSession ? 'focus' : 'dashboard',
        }));

        // Clean up expired sessions
        if (scheduledSessions.length !== allScheduledSessions.length) {
          await storage.saveScheduledSessions(scheduledSessions);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (isInitialized) {
      console.log('Application initialization complete, starting data load');
      loadData();
    } else {
      setIsLoadingData(false);
    }
  }, [storage, isInitialized]);

  // 定期检查任务群过期状态
  useEffect(() => {
    if (!isInitialized) return;
    
    const checkExpiredGroups = () => {
      setState(prev => {
        let hasChanges = false;
        const updatedChains = prev.chains.map(chain => {
          if (chain.type === 'group' && isGroupExpired(chain)) {
            hasChanges = true;
            return resetGroupProgress(chain);
          }
          return chain;
        });

        if (hasChanges) {
          storage.saveChains(updatedChains);
          return { ...prev, chains: updatedChains };
        }
        return prev;
      });
    };

    // 每分钟检查一次
    const interval = setInterval(checkExpiredGroups, 60000);
    return () => clearInterval(interval);
  }, [storage, isInitialized]);

  // Clean up expired scheduled sessions periodically
  useEffect(() => {
    if (!isInitialized) return;
    
    const interval = setInterval(() => {
      setState(prev => {
        const expiredSessions = prev.scheduledSessions.filter(
          session => isSessionExpired(session.expiresAt)
        );
        const activeScheduledSessions = prev.scheduledSessions.filter(
          session => !isSessionExpired(session.expiresAt)
        );
        
        if (expiredSessions.length > 0) {
          // Play sound for expired sessions
          soundManager.playTimerFinished();

          // 为每个过期的会话显示失败通知
          expiredSessions.forEach(session => {
            const chain = prev.chains.find(c => c.id === session.chainId);
            if (chain) {
              notificationManager.notifyScheduleFailed(chain.name);
            }
          });
          
          // Show auxiliary judgment for the first expired session
          if (expiredSessions.length > 0) {
            setShowAuxiliaryJudgment(expiredSessions[0].chainId);
          }
          storage.saveScheduledSessions(activeScheduledSessions);
          return { ...prev, scheduledSessions: activeScheduledSessions };
        }
        
        return prev;
      });
    }, 10000); // Check every 10 seconds for better responsiveness

    return () => clearInterval(interval);
  }, [storage, isInitialized]);

  const { handleCreateChain, handleCreateTaskGroup, handleEditChain, handleSaveChain } = useChainsDomain({
    state,
    setState,
    storage,
    safelySaveChains,
  });

  const { openRSIP, saveNodes: saveRSIPNodes, saveMeta: saveRSIPMeta } = useRsipDomain({ setState, storage });

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
    setCurrentSessionId,
    setShowBettingModal,
    setShowAuxiliaryJudgment,
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
    setState,
    storage,
    safelySaveChains,
    setShowAuxiliaryJudgment,
  });

  /*
  const handleAddException = (exceptionRule: string) => {
    if (!state.activeSession) return;

    setState(prev => {
      const updatedChains = prev.chains.map(chain =>
        chain.id === prev.activeSession!.chainId
          ? {
              ...chain,
              exceptions: [...(chain.exceptions || []), exceptionRule]
            }
          : chain
      );
      
      // 使用安全保存方法保持回收箱数据完整
      safelySaveChains(updatedChains).catch(error => {
      queryOptimizer.onDataChange('chains');
        console.error('添加异常时保存链条数据失败:', error);
      });
      
      return {
        ...prev,
        chains: updatedChains,
      };
    });
  };
  */

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

  const { handleDeleteChain, handleRestoreChains, handlePermanentDeleteChains } = useRecycleBinDomain({
    setState,
    storage,
    setRecycleBinRefreshTrigger,
  });

  const handleImportChains = async (importedChains: Chain[], options?: { 
    history?: CompletionHistory[];
    rsipNodes?: RSIPNode[];
    rsipMeta?: RSIPMeta;
    exceptionRules?: any[];
  }) => {
    console.log('开始导入数据...', { chains: importedChains.length, options });
    
    try {
      // CRITICAL FIX: Additional authentication check as a safety net
      console.log('Double-checking authentication state before import operations...');
      const isAuth = await isUserAuthenticated();
      
      if (!isAuth) {
        console.log('Authentication not ready, waiting...');
        const { user, isAuthenticated } = await waitForAuthentication(10000);
        
        if (!isAuthenticated || !user) {
          throw new Error('Authentication failed during import. Please ensure you are logged in and try again.');
        }
        
        console.log('Authentication confirmed after wait. User ID:', user.id);
      }
      
      console.log('准备保存导入的数据到存储...');
      
      // 验证导入的链条数据
      if (!Array.isArray(importedChains) || importedChains.length === 0) {
        throw new Error('没有有效的链条数据可导入');
      }
      
      // 获取当前最新的链条数据（避免使用可能过期的state.chains）
      const currentChains = await storage.getChains();
      console.log('当前数据库中的链条数量:', currentChains.length);
      console.log('准备导入的链条数量:', importedChains.length);
      
      // 检查ID冲突（双重保险）
      const existingIds = new Set(currentChains.map(c => c.id));
      const conflictingChains = importedChains.filter(c => existingIds.has(c.id));
      if (conflictingChains.length > 0) {
        console.error('发现ID冲突的链条:', conflictingChains.map(c => c.id));
        throw new Error(`导入失败：发现${conflictingChains.length}个ID冲突的链条`);
      }
      
      // 创建合并后的链条列表（但只保存导入的部分）
      const updatedChains = [...currentChains, ...importedChains];
      
      // 仅保存合并后的完整链条列表（让saveChains处理用户权限）
      await safelySaveChains(updatedChains);
      queryOptimizer.onDataChange('chains');
      
      // 获取导入的其他数据
      const importedHistory = options?.history || [];
      const importedRsipNodes = options?.rsipNodes || [];
      const importedRsipMeta = options?.rsipMeta;
      
      // 保存完成历史
      if (Array.isArray(importedHistory) && importedHistory.length > 0) {
        const existing = await storage.getCompletionHistory();
        const merged = [...existing, ...importedHistory];
        await storage.saveCompletionHistory(merged);
      }
      
      // 保存 RSIP 节点数据
      if (Array.isArray(importedRsipNodes) && importedRsipNodes.length > 0) {
        const existingNodes = await storage.getRSIPNodes();
        const mergedNodes = [...existingNodes, ...importedRsipNodes];
        await storage.saveRSIPNodes(mergedNodes);
      }
      
      // 保存 RSIP 元数据
      if (importedRsipMeta) {
        const existingMeta = await storage.getRSIPMeta();
        const mergedMeta = { ...existingMeta, ...importedRsipMeta };
        await storage.saveRSIPMeta(mergedMeta);
      }
      
      console.log('导入数据保存成功，更新UI状态');
      
      // 更新状态
      setState(prev => ({
        ...prev,
        chains: updatedChains,
        completionHistory: Array.isArray(importedHistory) && importedHistory.length > 0
          ? [...prev.completionHistory, ...importedHistory]
          : prev.completionHistory,
        rsipNodes: Array.isArray(importedRsipNodes) && importedRsipNodes.length > 0
          ? [...prev.rsipNodes, ...importedRsipNodes]
          : prev.rsipNodes,
        rsipMeta: importedRsipMeta ? { ...prev.rsipMeta, ...importedRsipMeta } : prev.rsipMeta,
      }));
      
      console.log('导入完成，UI状态更新完成');
    } catch (error) {
      console.error('Failed to import data:', error);
      // 提供更详细的错误信息
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`导入失败: ${errorMessage}\n\n请查看控制台了解详细信息，然后重试`);
      
      // 如果导入失败，重新加载数据以确保状态一致性
      try {
        const currentChains = await storage.getChains();
        const currentRsipNodes = await storage.getRSIPNodes();
        const currentRsipMeta = await storage.getRSIPMeta();
        setState(prev => ({
          ...prev,
          chains: currentChains,
          rsipNodes: currentRsipNodes,
          rsipMeta: currentRsipMeta,
        }));
      } catch (reloadError) {
        console.error('重新加载数据也失败了:', reloadError);
      }
    }
  };

  const handleImportUnits = async (unitIds: string[], groupId: string, mode: 'move' | 'copy' = 'copy') => {
    console.log('开始导入单元到任务群...', { unitIds, groupId, mode });
    
    try {
      let updatedChains: Chain[];
      
      if (mode === 'copy') {
        // 复制模式：创建副本并加入任务群，原单元保持独立
        const copiesToAdd: Chain[] = [];
        
        state.chains.forEach(chain => {
          if (unitIds.includes(chain.id)) {
            const copy: Chain = {
              ...chain,
              id: crypto.randomUUID(), // 生成新的ID
              name: `${chain.name} (副本)`, // 添加副本标识
              parentId: groupId,
              currentStreak: 0, // 重置记录
              auxiliaryStreak: 0,
              totalCompletions: 0,
              totalFailures: 0,
              auxiliaryFailures: 0,
              createdAt: new Date(),
              lastCompletedAt: undefined,
            };
            copiesToAdd.push(copy);
          }
        });
        
        updatedChains = [...state.chains, ...copiesToAdd];
      } else {
        // 移动模式：更新选中单元的 parentId 为目标任务群的 ID
        updatedChains = state.chains.map(chain => {
          if (unitIds.includes(chain.id)) {
            return { ...chain, parentId: groupId };
          }
          return chain;
        });
      }
      
      console.log('准备保存导入后的数据到存储...');
      // Wait for data to be saved before updating UI - 使用安全保存方法
      await safelySaveChains(updatedChains);
      queryOptimizer.onDataChange('chains');
      console.log('导入数据保存成功，更新UI状态');
      
      // Only update state after successful save
      setState(prev => ({
        ...prev,
        chains: updatedChains,
      }));
      console.log('导入完成，UI状态更新完成');
    } catch (error) {
      console.error('Failed to import units:', error);
      // 提供更详细的错误信息
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`导入失败: ${errorMessage}\n\n请查看控制台了解详细信息，然后重试`);
      
      // 如果导入失败，重新加载数据以确保状态一致性
      try {
        const currentChains = await storage.getChains();
        setState(prev => ({
          ...prev,
          chains: currentChains,
        }));
      } catch (reloadError) {
        console.error('重新加载数据也失败了:', reloadError);
      }
    }
  };

  const handleUpdateTaskRepeatCount = async (chainId: string, repeatCount: number) => {
    console.log('开始更新任务重复次数...', { chainId, repeatCount });
    
    try {
      // 找到要更新的链条
      const updatedChains = state.chains.map(chain => {
        if (chain.id === chainId) {
          return { ...chain, taskRepeatCount: repeatCount };
        }
        return chain;
      });

      console.log('准备保存重复次数更新到存储...');
      // Wait for data to be saved before updating UI - 使用安全保存方法
      await safelySaveChains(updatedChains);
      queryOptimizer.onDataChange('chains');
      console.log('重复次数更新保存成功，更新UI状态');

      // Only update state after successful save
      setState(prev => ({
        ...prev,
        chains: updatedChains,
      }));
      console.log('重复次数更新完成，UI状态更新完成');
    } catch (error) {
      console.error('Failed to update task repeat count:', error);
      // 提供更详细的错误信息
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`重复次数更新失败: ${errorMessage}\n\n请查看控制台了解详细信息，然后重试`);
      
      // 如果更新失败，重新加载数据以确保状态一致性
      try {
        const currentChains = await storage.getChains();
        setState(prev => ({
          ...prev,
          chains: currentChains,
        }));
      } catch (reloadError) {
        console.error('重新加载数据也失败了:', reloadError);
      }
    }
  };

  return (
    <>
      {renderContent()}

      {/* Betting Modal - 懒加载 */}
      {showBettingModal && pendingChainId && currentSessionId && (
        <Suspense fallback={null}>
          <BettingModal
            isOpen={showBettingModal}
            onClose={handleBetCancelled}
            onBetPlaced={handleBetPlaced}
            sessionId={currentSessionId}
            chainName={state.chains.find(c => c.id === pendingChainId)?.name || 'Unknown Task'}
            taskDuration={state.chains.find(c => c.id === pendingChainId)?.duration || 0}
          />
        </Suspense>
      )}
    </>
  );
}

export default AppShell;
