import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Chain, ScheduledSession, ChainTreeNode } from '../types';
import { Play, Clock, MoreHorizontal, Trash2, Flame, Calendar, Bell, Check, AlertTriangle, TrendingUp, Settings } from 'lucide-react';
import { formatDuration, formatTime, formatTimeDescriptionByLanguage, getTimeRemaining } from '../utils/time';
import { getChainTypeConfig } from '../utils/chainTree';
import { Icon } from '../utils/iconMap';
import { notificationManager } from '../utils/notifications';
import { useStorage } from '../storage/useStorage';
import { soundManager } from '../utils/soundManager';
import { isDev } from '../utils/env';
import { logger } from '../utils/logger';
import { toError } from '../utils/errorMessage';
import { useI18n } from '../i18n';
import { getAuxiliarySignalLabel, getTriggerLabel } from './chain-editor/constants';

interface ChainCardProps {
  chain: Chain | ChainTreeNode;
  scheduledSession?: ScheduledSession;
  onStartChain: (chainId: string) => void;
  onScheduleChain: (chainId: string) => void;
  onViewDetail: (chainId: string) => void;
  onCancelScheduledSession?: (chainId: string) => void;
  onCompleteBooking?: (chainId: string) => void;
  onDelete: (chainId: string) => void;
}

// Performance optimized ChainCard component with React.memo
export const ChainCard: React.FC<ChainCardProps> = React.memo(({
  chain,
  scheduledSession,
  onStartChain,
  onScheduleChain,
  onViewDetail,
  onCancelScheduledSession,
  onCompleteBooking,
  onDelete,
}) => {
  const { language, tr } = useI18n();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [hasShownWarning, setHasShownWarning] = useState(false);
  const [lastCompletionTime, setLastCompletionTime] = useState<number | null>(null);
  const lastPlayedExpiresAtRef = React.useRef<number | null>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const storage = useStorage();

  // Focus management for delete confirmation dialog
  useEffect(() => {
    if (showDeleteConfirm && deleteDialogRef.current) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      const cancelButton = deleteDialogRef.current.querySelector('[data-cancel-button]') as HTMLElement;
      cancelButton?.focus();
    } else if (!showDeleteConfirm && previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus();
      previouslyFocusedRef.current = null;
    }
  }, [showDeleteConfirm]);

  // Handle Escape key for delete dialog
  const handleDialogKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDeleteConfirm(false);
    }
  }, []);
  
  // 获取实际的链条数据，确保显示最新的时长信息 - memoized for performance
  const actualChain = useMemo(() => {
    // 如果传入的是 ChainTreeNode，需要确保数据是最新的
    return chain;
  }, [chain]);

  // Memoize type configuration to prevent recalculation
  const typeConfig = useMemo(() => getChainTypeConfig(chain.type, language), [chain.type, language]);

  // 获取上次完成时间（仅对无时长任务）
  useEffect(() => {
    let didCancel = false;

    if (!chain.isDurationless && chain.duration !== 0) {
      setLastCompletionTime(null);
      return;
    }

    (async () => {
      try {
        const lastTime = await storage.getLastCompletionTime(chain.id);
        if (!didCancel) {
          setLastCompletionTime(lastTime);
        }
      } catch (error) {
        if (!didCancel) {
          setLastCompletionTime(null);
        }
        if (isDev) {
          logger.warn('CHAIN_CARD', 'Failed to load last completion time', { chainId: chain.id }, toError(error));
        }
      }
    })();

    return () => {
      didCancel = true;
    };
  }, [chain.id, chain.isDurationless, chain.duration, storage]);

  // 计算通知时机
  const getNotificationThreshold = (durationMinutes: number) => {
    if (durationMinutes <= 3) return null; // 小于等于3分钟不通知
    const thresholdMinutes = Math.floor(durationMinutes / 3);
    return Math.min(thresholdMinutes, 1) * 60; // 转换为秒，最多1分钟
  };
  useEffect(() => {
    if (!scheduledSession) {
      lastPlayedExpiresAtRef.current = null;
      return;
    }

    const notificationThreshold = getNotificationThreshold(chain.auxiliaryDuration);

    const updateTimer = () => {
      const remaining = getTimeRemaining(scheduledSession.expiresAt);
      setTimeRemaining(remaining);
      
      // 根据新逻辑显示警告通知
      if (notificationThreshold && remaining <= notificationThreshold && remaining > 0 && !hasShownWarning) {
        setHasShownWarning(true);
        const minutes = Math.max(1, Math.ceil(remaining / 60));
        notificationManager.notifyScheduleWarning(
          chain.name, 
          tr(`${minutes}分钟`, `${minutes} min`)
        );
      }
      
      if (remaining <= 0) {
        // 预约失败通知
        notificationManager.notifyScheduleFailed(chain.name);
        
        // Play sound when timer reaches 0, but only once per session
        if (lastPlayedExpiresAtRef.current !== scheduledSession.expiresAt.getTime()) {
          soundManager.playTimerFinished();
          lastPlayedExpiresAtRef.current = scheduledSession.expiresAt.getTime();
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [scheduledSession, hasShownWarning, chain.name, chain.auxiliaryDuration, tr]);

  // 重置警告状态当预约会话改变时
  React.useEffect(() => {
    setHasShownWarning(false);
  }, [scheduledSession?.scheduledAt, scheduledSession?.chainId]);

  const isScheduled = scheduledSession && timeRemaining > 0;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
    setShowMenu(false);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(chain.id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="relative">
      <div 
        className="bento-card cursor-pointer group animate-scale-in"
        onClick={() => onViewDetail(chain.id)}
      >
        {/* Menu button */}
        <div className="absolute top-6 right-6">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            aria-label={tr('更多选项', 'More options')}
            aria-expanded={showMenu ? 'true' : 'false'}
            className="p-3 min-w-[44px] min-h-[44px] text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 focus-ring"
          >
            <MoreHorizontal size={16} aria-hidden="true" />
          </button>

          {showMenu && (
            <div
              role="menu"
              aria-orientation="vertical"
              className="absolute right-0 top-12 bg-white dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-2xl border border-gray-200 dark:border-slate-600 py-2 z-10 min-w-[140px]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleDeleteClick}
                className="w-full px-4 py-3 text-left text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-3 transition-colors"
              >
                <Trash2 size={14} aria-hidden="true" />
                <span className="font-chinese font-medium">{tr('删除链条', 'Delete chain')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-8 h-8 rounded-xl ${typeConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                <Icon name={typeConfig.icon} size={14} className={typeConfig.color} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100 group-hover:text-primary-500 transition-colors truncate">
                  {chain.name}
                </h3>
                {chain.type !== 'unit' && (
                  <p className="text-xs font-mono text-gray-500 tracking-wide truncate">
                    {typeConfig.name}
                  </p>
                )}
              </div>
            </div>
            <p className="text-gray-600 dark:text-slate-400 text-sm mb-3 font-mono tracking-wide truncate">
              {getTriggerLabel(chain.trigger, language)}
            </p>
            <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed line-clamp-2">
              {chain.description}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 dark:from-primary-500/20 dark:to-primary-600/10 border border-primary-200/50 dark:border-primary-400/30">
            <div className="flex items-center justify-center space-x-2 text-primary-500 mb-2">
              <Flame size={18} />
              <span className="text-3xl font-bold font-mono">#{chain.currentStreak}</span>
            </div>
            <div className="text-xs font-chinese text-gray-600 dark:text-slate-400 font-medium">
              {tr('主链记录', 'Main streak')}
            </div>
          </div>
          <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10 border border-blue-200/50 dark:border-blue-400/30">
            <div className="flex items-center justify-center space-x-2 text-blue-500 mb-2">
              <Calendar size={18} />
              <span className="text-3xl font-bold font-mono">#{chain.auxiliaryStreak}</span>
            </div>
            <div className="text-xs font-chinese text-gray-600 dark:text-slate-400 font-medium">
              {tr('预约链记录', 'Booking streak')}
            </div>
          </div>
        </div>

        {/* Duration and completions */}
        <div className="flex items-center justify-between mb-6 p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center space-x-2 text-gray-700 dark:text-slate-300">
            <Clock size={16} />
            <span className="font-medium">
              {(actualChain.isDurationless || actualChain.duration === 0) 
                ? (lastCompletionTime 
                    ? `${tr('上次：', 'Last: ')}${formatTimeDescriptionByLanguage(lastCompletionTime, language)}`
                    : tr('首次执行', 'First time')
                  )
                : formatTime(actualChain.duration, language)
              }
            </span>
          </div>
          <div className="text-gray-600 dark:text-slate-400 text-sm font-mono">
            {language === 'zh'
              ? `${actualChain.totalCompletions} 次完成`
              : `${actualChain.totalCompletions} completion${actualChain.totalCompletions === 1 ? '' : 's'}`}
          </div>
        </div>

        {/* Scheduled session */}
        {isScheduled && (
          <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10 rounded-2xl p-4 mb-6 border border-blue-200/50 dark:border-blue-400/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-blue-600 min-w-0 flex-1 mr-2">
                <Bell size={14} className="flex-shrink-0" />
                <span className="text-sm font-chinese font-medium truncate">
                  {tr('预约信号: ', 'Signal: ')}
                  {getAuxiliarySignalLabel(scheduledSession.auxiliarySignal, language)}
                </span>
              </div>
              <div className="text-blue-700 dark:text-blue-400 font-mono font-bold text-lg flex-shrink-0">
                {formatDuration(timeRemaining)}
              </div>
            </div>
            <div className="text-blue-600 dark:text-blue-400 text-xs mb-3 font-chinese truncate">
              {tr('请在时间结束前完成: ', 'Complete before time runs out: ')}
              {getTriggerLabel(chain.auxiliaryCompletionTrigger, language)}
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCompleteBooking?.(chain.id);
                }}
                className="flex-1 bg-green-500/10 hover:bg-green-500/20 dark:bg-green-500/20 dark:hover:bg-green-500/30 text-green-600 dark:text-green-400 px-3 py-3 rounded-xl text-sm transition-colors duration-200 flex items-center justify-center space-x-2 border border-green-200/50 dark:border-green-400/30"
              >
                <Check size={14} />
                <span className="font-chinese font-medium">{tr('完成预约', 'Complete booking')}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelScheduledSession?.(chain.id);
                }}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 dark:bg-red-500/20 dark:hover:bg-red-500/30 text-red-600 dark:text-red-400 px-3 py-3 rounded-xl text-sm transition-colors duration-200 flex items-center justify-center space-x-2 border border-red-200/50 dark:border-red-400/30"
              >
                <AlertTriangle size={14} />
                <span className="font-chinese font-medium">{tr('中断/规则判定', 'Interrupt / Adjudicate')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex space-x-3" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onStartChain(chain.id)}
            className="flex-1 gradient-primary hover:shadow-xl text-white px-4 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 hover:scale-105 shadow-lg focus-ring"
          >
            <Play size={16} aria-hidden="true" />
            <span className="font-chinese font-semibold">{tr('开始任务', 'Start')}</span>
          </button>

          {!isScheduled && (
            <button
              type="button"
              onClick={() => onScheduleChain(chain.id)}
              className="flex-1 gradient-dark hover:shadow-xl text-white px-4 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 hover:scale-105 shadow-lg focus-ring"
            >
              <Clock size={16} aria-hidden="true" />
              <span className="font-chinese font-semibold">{tr('预约', 'Schedule')}</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            ref={deleteDialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
            onKeyDown={handleDialogKeyDown}
            className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full border border-gray-200/60 dark:border-slate-600/60 shadow-2xl animate-scale-in"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                <Trash2 size={24} className="text-red-500" aria-hidden="true" />
              </div>
              <h3 id="delete-dialog-title" className="text-2xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-3">
                {tr('确认删除链条', 'Delete chain?')}
              </h3>
              <p id="delete-dialog-description" className="text-gray-600 dark:text-slate-300 mb-6">
                {tr('你确定要删除链条 "', 'Are you sure you want to delete the chain "')}
                <span className="text-primary-500 font-semibold">{chain.name}</span>
                {tr('" 吗？', '"?')}
              </p>
            </div>
            
            <div className="bg-red-50/80 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200/60 dark:border-red-800/40 mb-8">
              <div className="text-center mb-6">
                <p className="text-red-600 dark:text-red-400 text-sm font-medium font-chinese">
                  {tr('⚠️ 此操作将永久删除以下数据：', '⚠️ This will permanently delete:')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-red-600 dark:text-red-400 text-sm">
                <div className="bg-white/80 dark:bg-slate-700/50 rounded-xl p-4 border border-red-200/60 dark:border-red-800/40">
                  <div className="font-semibold mb-3 flex items-center font-chinese">
                    <Flame size={14} className="mr-2" />
                    {tr('主链数据', 'Main chain')}
                  </div>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                    <div>
                      {tr('记录: ', 'Streak: ')}#{chain.currentStreak}
                    </div>
                    <div>
                      {tr('完成: ', 'Completions: ')}
                      {chain.totalCompletions}
                    </div>
                    <div>
                      {tr('失败: ', 'Failures: ')}
                      {chain.totalFailures}
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-slate-700/50 rounded-xl p-4 border border-red-200/60 dark:border-red-800/40">
                  <div className="font-semibold mb-3 flex items-center font-chinese">
                    <Calendar size={14} className="mr-2" />
                    {tr('预约链数据', 'Booking')}
                  </div>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                    <div>
                      {tr('记录: ', 'Streak: ')}#{chain.auxiliaryStreak}
                    </div>
                    <div>
                      {tr('失败: ', 'Failures: ')}
                      {chain.auxiliaryFailures}
                    </div>
                    <div>
                      {tr('例外: ', 'Exceptions: ')}
                      {chain.auxiliaryExceptions?.length || 0}
                      {language === 'zh' ? ' 条' : ''}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-red-600 dark:text-red-400 text-sm mt-4">
                <div className="bg-white/80 dark:bg-slate-700/50 rounded-xl p-4 border border-red-200/60 dark:border-red-800/40">
                  <div className="font-semibold mb-3 flex items-center font-chinese">
                    <TrendingUp size={14} className="mr-2" />
                    {tr('历史记录', 'History')}
                  </div>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                    <div>
                      {tr('完成记录: ', 'Completions: ')}
                      {chain.totalCompletions}
                      {language === 'zh' ? ' 次' : ''}
                    </div>
                    <div>
                      {tr('失败记录: ', 'Failures: ')}
                      {chain.totalFailures}
                      {language === 'zh' ? ' 次' : ''}
                    </div>
                    <div>
                      {tr('成功率: ', 'Success rate: ')}
                      {chain.totalCompletions > 0
                        ? Math.round((chain.totalCompletions / (chain.totalCompletions + chain.totalFailures)) * 100)
                        : 0}
                      %
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-slate-700/50 rounded-xl p-4 border border-red-200/60 dark:border-red-800/40">
                  <div className="font-semibold mb-3 flex items-center font-chinese">
                    <Settings size={14} className="mr-2" />
                    {tr('规则设置', 'Rules')}
                  </div>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                    <div>
                      {tr('例外: ', 'Exceptions: ')}
                      {chain.exceptions.length}
                      {language === 'zh' ? ' 条' : ''}
                    </div>
                    <div>
                      {tr('预约例外: ', 'Booking exceptions: ')}
                      {chain.auxiliaryExceptions?.length || 0}
                      {language === 'zh' ? ' 条' : ''}
                    </div>
                    <div>{tr('所有配置', 'All settings')}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                type="button"
                data-cancel-button
                onClick={handleCancelDelete}
                className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 px-6 py-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105 font-chinese focus-ring"
              >
                {tr('取消', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl font-chinese focus-ring"
              >
                <Trash2 size={16} aria-hidden="true" />
                <span>{tr('确认删除', 'Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Add display name for better debugging
ChainCard.displayName = 'ChainCard';
