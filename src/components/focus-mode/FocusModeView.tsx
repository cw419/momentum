import type {
  ActiveSession,
  Chain,
  ExceptionRule,
  ExceptionRuleType,
  PauseOptions,
  SessionContext,
} from '../../types';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Flame,
  Hourglass,
  Maximize,
  X,
} from 'lucide-react';
import {
  formatDuration,
  formatElapsedTime,
  formatLastCompletionReference,
  formatTimeDescriptionByLanguage,
} from '../../utils/time';
import { FocusModeControls } from './FocusModeControls';
import { InterruptConfirmDialog } from './InterruptConfirmDialog';
import { RuleSelectionDialog } from '../RuleSelectionDialog';
import { TaskCompletionDialog } from '../TaskCompletionDialog';
import { UserFeedbackDisplay } from '../UserFeedbackDisplay';
import { useI18n } from '../../i18n';
import { getTriggerLabel } from '../chain-editor/constants';

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
  const { language, tr } = useI18n();
  const elapsedMinutes = Math.ceil(elapsedSeconds / 60);
  const elapsedWholeMinutes = Math.floor(
    (session.duration * 60 - timeRemaining) / 60,
  );
  const interruptLabel = tr('中断任务', 'Interrupt');

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--surface-canvas)] px-4 py-20 sm:px-6">
      <div className="absolute right-4 top-4 z-20 flex items-center space-x-2">
        {!isFullscreen ? (
          <button
            type="button"
            onClick={onEnterFullscreen}
            aria-label={tr('进入全屏', 'Enter fullscreen')}
            className="focus-ring flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-950 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300 dark:hover:text-white"
            title={tr('进入全屏 (F11)', 'Enter fullscreen (F11)')}
          >
            <Maximize size={20} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onExitFullscreen}
            aria-label={tr('退出全屏', 'Exit fullscreen')}
            className="focus-ring flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-950 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300 dark:hover:text-white"
            title={tr('退出全屏 (ESC)', 'Exit fullscreen (ESC)')}
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="relative z-10 w-full max-w-5xl animate-fade-in">
        <header className="mb-12 border-b border-gray-200 pb-6 dark:border-slate-700 sm:mb-16">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30">
              <Flame
                className="text-primary-600 dark:text-primary-300"
                size={22}
              />
            </div>
            <div className="min-w-0 text-left">
              <h1 className="truncate font-chinese text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
                {chain.name}
              </h1>
              <p className="mt-1 truncate font-chinese text-sm text-gray-500 dark:text-gray-400">
                {getTriggerLabel(chain.trigger, language)}
              </p>
            </div>
          </div>
        </header>

        <section className="mb-12 text-center sm:mb-16" aria-live="polite">
          <div className="mb-8 font-mono text-[clamp(4rem,15vw,9rem)] font-light leading-none tracking-tight text-gray-950 [font-variant-numeric:tabular-nums] dark:text-white">
            {isDurationless
              ? formatElapsedTime(elapsedSeconds)
              : formatDuration(timeRemaining)}
          </div>

          <div className="mx-auto mb-6 h-2 w-full max-w-2xl overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-primary-600 transition-[width] duration-1000 ease-out dark:bg-primary-400"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <Clock className="text-primary-500" size={16} />
              <span className="font-mono">
                {isDurationless
                  ? `${tr('已用时 ', 'Elapsed: ')}${formatTimeDescriptionByLanguage(elapsedMinutes, language)}`
                  : tr(
                      `${elapsedWholeMinutes}分钟 / ${session.duration}分钟`,
                      `${elapsedWholeMinutes} min / ${session.duration} min`,
                    )}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Flame className="text-primary-500" size={16} />
              <span className="font-mono">#{chain.currentStreak}</span>
            </div>
          </div>

          {isDurationless && lastCompletionTime !== null && (
            <div className="mt-4 font-chinese text-sm text-gray-500 dark:text-gray-400">
              {formatLastCompletionReference(lastCompletionTime, language)}
            </div>
          )}

          {isDurationless &&
            chain.minimumDuration &&
            chain.minimumDuration > 0 &&
            !hasReachedMinimum && (
              <div className="mt-4 font-chinese text-lg text-indigo-600 dark:text-indigo-400">
                <div className="flex items-center justify-center space-x-2">
                  <Hourglass className="text-indigo-500" size={16} />
                  <span>
                    {tr(
                      `还需 ${Math.floor(minimumCountdown / 60)}分${minimumCountdown % 60}秒 达到最小时长`,
                      `Need ${Math.floor(minimumCountdown / 60)}m ${minimumCountdown % 60}s to reach the minimum duration`,
                    )}
                  </span>
                </div>
              </div>
            )}

          {isDurationless &&
            chain.minimumDuration &&
            chain.minimumDuration > 0 &&
            hasReachedMinimum && (
              <div className="mt-4 font-chinese text-lg text-green-600 dark:text-green-400">
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="text-green-500" size={16} />
                  <span>
                    {tr(
                      `已达到最小时长 ${chain.minimumDuration} 分钟，可以完成任务`,
                      `Minimum duration reached (${chain.minimumDuration} min). You can complete the task.`,
                    )}
                  </span>
                </div>
              </div>
            )}
        </section>

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
        <div className="fixed bottom-4 right-4 z-30 sm:bottom-6 sm:right-6">
          <button
            type="button"
            onClick={onInterruptClick}
            aria-label={interruptLabel}
            className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-[var(--surface-raised)] px-3 py-2 text-red-700 transition-colors hover:border-red-300 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
            title={interruptLabel}
          >
            <AlertTriangle size={18} aria-hidden="true" />
            <span className="hidden text-sm font-medium sm:inline">
              {interruptLabel}
            </span>
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

      <InterruptConfirmDialog
        isOpen={showInterruptDialog}
        onCancel={onCancelInterrupt}
        onConfirm={onConfirmInterrupt}
      />

      <UserFeedbackDisplay />
    </main>
  );
}
