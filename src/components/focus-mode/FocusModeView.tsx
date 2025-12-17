import type { ActiveSession, Chain, ExceptionRule, ExceptionRuleType, PauseOptions, SessionContext } from '../../types';
import { AlertTriangle, CheckCircle, Clock, Flame, Hourglass, Maximize, X } from 'lucide-react';
import {
  formatDuration,
  formatElapsedTime,
  formatLastCompletionReference,
  formatTimeDescription,
} from '../../utils/time';
import { FocusModeControls } from './FocusModeControls';
import { InterruptConfirmDialog } from './InterruptConfirmDialog';
import { RuleSelectionDialog } from '../RuleSelectionDialog';
import { TaskCompletionDialog } from '../TaskCompletionDialog';
import { UserFeedbackDisplay } from '../UserFeedbackDisplay';

interface FocusModeViewProps {
  session: ActiveSession;
  chain: Chain;
  isDurationless: boolean;
  timeRemaining: number;
  elapsedSeconds: number;
  progress: number;
  lastCompletionTime: number | null;
  hasReachedMinimum: boolean;
  minimumCountdown: number;

  isFullscreen: boolean;
  onEnterFullscreen: () => void;
  onExitFullscreen: () => void;

  onPauseClick: () => void;
  onEarlyCompleteClick: () => void;
  onInterruptClick: () => void;

  showRuleSelection: boolean;
  pendingActionType: 'pause' | 'early_completion' | null;
  sessionContext: SessionContext;
  onRuleSelected: (rule: ExceptionRule, pauseOptions?: PauseOptions) => void;
  onCreateNewRule: (name: string, type: ExceptionRuleType) => void;
  onRuleSelectionCancel: () => void;

  showCompletionDialog: boolean;
  onDirectComplete: (description?: string, notes?: string) => void;
  onCompletionCancel: () => void;

  showInterruptDialog: boolean;
  onCancelInterrupt: () => void;
  onConfirmInterrupt: () => void;

  autoResumeAt: number | null;
  resumeCountdown: number;
  elapsedPauseTime: number;
  onResumeNow: () => void;
  onCancelAutoResume: () => void;
}

export function FocusModeView({
  session,
  chain,
  isDurationless,
  timeRemaining,
  elapsedSeconds,
  progress,
  lastCompletionTime,
  hasReachedMinimum,
  minimumCountdown,
  isFullscreen,
  onEnterFullscreen,
  onExitFullscreen,
  onPauseClick,
  onEarlyCompleteClick,
  onInterruptClick,
  showRuleSelection,
  pendingActionType,
  sessionContext,
  onRuleSelected,
  onCreateNewRule,
  onRuleSelectionCancel,
  showCompletionDialog,
  onDirectComplete,
  onCompletionCancel,
  showInterruptDialog,
  onCancelInterrupt,
  onConfirmInterrupt,
  autoResumeAt,
  resumeCountdown,
  elapsedPauseTime,
  onResumeNow,
  onCancelAutoResume,
}: FocusModeViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-[#161615] dark:via-black dark:to-[#161615] flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
        {!isFullscreen ? (
          <button
            onClick={onEnterFullscreen}
            className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm hover:bg-white/20 text-gray-600 dark:text-gray-300 transition-all duration-300 border border-white/20"
            title="进入全屏 (F11)"
          >
            <Maximize size={20} />
          </button>
        ) : (
          <button
            onClick={onExitFullscreen}
            className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm hover:bg-white/20 text-gray-600 dark:text-gray-300 transition-all duration-300 border border-white/20"
            title="退出全屏 (ESC)"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-primary-500/5 dark:from-primary-500/5 dark:via-transparent dark:to-primary-500/5"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 dark:bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-500/5 dark:bg-primary-500/5 rounded-full blur-3xl animate-pulse-slow"
        style={{ animationDelay: '1s' }}
      ></div>

      <div className="relative z-10 text-center animate-fade-in">
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-16 h-16 rounded-3xl bg-primary-500/20 backdrop-blur-sm flex items-center justify-center border border-primary-500/30 dark:bg-primary-500/20 dark:border-primary-500/30">
              <Flame className="text-primary-500" size={32} />
            </div>
            <div className="text-left">
              <h1 className="text-5xl md:text-6xl font-light font-chinese text-gray-900 dark:text-white mb-2">
                {chain.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-mono tracking-wider">{chain.trigger}</p>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <div className="text-8xl md:text-9xl font-mono font-light text-gray-900 dark:text-white mb-8 tracking-wider">
            {isDurationless ? formatElapsedTime(elapsedSeconds) : formatDuration(timeRemaining)}
          </div>

          <div className="w-96 max-w-full h-3 bg-gray-200 dark:bg-white/10 backdrop-blur-sm rounded-full mx-auto mb-6 border border-gray-300 dark:border-white/20">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-1000 ease-out shadow-lg"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-center space-x-6 text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <Clock className="text-primary-500" size={16} />
              <span className="font-mono">
                {isDurationless
                  ? `已用时 ${formatTimeDescription(Math.ceil(elapsedSeconds / 60))}`
                  : `${Math.floor((session.duration * 60 - timeRemaining) / 60)}分钟 / ${session.duration}分钟`}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Flame className="text-primary-500" size={16} />
              <span className="font-mono">#{chain.currentStreak}</span>
            </div>
          </div>

          {isDurationless && lastCompletionTime !== null && (
            <div className="mt-4 text-gray-500 dark:text-gray-400 text-sm font-chinese">
              {formatLastCompletionReference(lastCompletionTime)}
            </div>
          )}

          {isDurationless && chain.minimumDuration && chain.minimumDuration > 0 && !hasReachedMinimum && (
            <div className="mt-4 text-indigo-600 dark:text-indigo-400 text-lg font-chinese">
              <div className="flex items-center justify-center space-x-2">
                <Hourglass className="text-indigo-500" size={16} />
                <span>
                  还需 {Math.floor(minimumCountdown / 60)}分{minimumCountdown % 60}秒 达到最小时长
                </span>
              </div>
            </div>
          )}

          {isDurationless && chain.minimumDuration && chain.minimumDuration > 0 && hasReachedMinimum && (
            <div className="mt-4 text-green-600 dark:text-green-400 text-lg font-chinese">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="text-green-500" size={16} />
                <span>已达到最小时长 {chain.minimumDuration} 分钟，可以完成任务</span>
              </div>
            </div>
          )}
        </div>

        <FocusModeControls
          session={session}
          chain={chain}
          isDurationless={isDurationless}
          hasReachedMinimum={hasReachedMinimum}
          onPauseClick={onPauseClick}
          onEarlyCompleteClick={onEarlyCompleteClick}
          autoResumeAt={autoResumeAt}
          resumeCountdown={resumeCountdown}
          elapsedPauseTime={elapsedPauseTime}
          onResumeNow={onResumeNow}
          onCancelAutoResume={onCancelAutoResume}
        />
      </div>

      {!session.isPaused && (
        <div className="fixed bottom-6 right-6 z-30">
          <button
            onClick={onInterruptClick}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center border-2 border-red-400"
            title="中断任务"
          >
            <AlertTriangle size={24} />
          </button>
        </div>
      )}

      {showRuleSelection && pendingActionType && (
        <RuleSelectionDialog
          isOpen={showRuleSelection}
          actionType={pendingActionType}
          sessionContext={sessionContext}
          onRuleSelected={onRuleSelected}
          onCreateNewRule={onCreateNewRule}
          onCancel={onRuleSelectionCancel}
        />
      )}

      {showCompletionDialog && (
        <TaskCompletionDialog
          isOpen={showCompletionDialog}
          chainName={chain.name}
          chainId={chain.id}
          isDurationless={isDurationless}
          onComplete={onDirectComplete}
          onCancel={onCompletionCancel}
        />
      )}

      <InterruptConfirmDialog isOpen={showInterruptDialog} onCancel={onCancelInterrupt} onConfirm={onConfirmInterrupt} />

      <UserFeedbackDisplay />
    </div>
  );
}
