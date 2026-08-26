import type {
  ActiveSession,
  Chain,
  ExceptionRule,
  ExceptionRuleType,
  PauseOptions,
  SessionContext,
} from '../../types';
import { useI18n } from '../../i18n';
import { FocusModeControls } from './FocusModeControls';
import { FocusModeDialogs } from './FocusModeDialogs';
import { FocusSessionHeader } from './FocusSessionHeader';
import { FocusTimerPanel } from './FocusTimerPanel';
import { LongPressInterruptButton } from './LongPressInterruptButton';
import { LayoutDashboard } from 'lucide-react';

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
  hasTimeExpired: boolean;
  isFullscreen: boolean;
  onEnterFullscreen: () => void;
  onExitFullscreen: () => void;
  onReturnToWorkspace: () => void;
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

export function FocusModeView(props: FocusModeViewProps) {
  const { language, tr } = useI18n();
  const { session, chain } = props;

  return (
    <main
      className={`relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--surface-canvas)] px-4 py-20 sm:px-6 ${session.isPaused ? 'focus-paused' : 'focus-running'}`}
    >
      <div className="relative z-10 w-full max-w-5xl animate-fade-in pt-14">
        <button
          type="button"
          onClick={props.onReturnToWorkspace}
          className="focus-ring absolute left-0 top-0 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <LayoutDashboard size={16} aria-hidden="true" />
          {tr('返回工作台', 'Workspace')}
        </button>
        <FocusSessionHeader
          chain={chain}
          language={language}
          isFullscreen={props.isFullscreen}
          onEnterFullscreen={props.onEnterFullscreen}
          onExitFullscreen={props.onExitFullscreen}
          tr={tr}
        />
        <FocusTimerPanel
          session={session}
          chain={chain}
          isDurationless={props.isDurationless}
          timeRemaining={props.timeRemaining}
          elapsedSeconds={props.elapsedSeconds}
          progress={props.progress}
          lastCompletionTime={props.lastCompletionTime}
          hasReachedMinimum={props.hasReachedMinimum}
          hasTimeExpired={props.hasTimeExpired}
          minimumCountdown={props.minimumCountdown}
          language={language}
          tr={tr}
        />
        <FocusModeControls
          session={session}
          chain={chain}
          isDurationless={props.isDurationless}
          hasReachedMinimum={props.hasReachedMinimum}
          onPauseClick={props.onPauseClick}
          onEarlyCompleteClick={props.onEarlyCompleteClick}
          autoResumeAt={props.autoResumeAt}
          resumeCountdown={props.resumeCountdown}
          elapsedPauseTime={props.elapsedPauseTime}
          onResumeNow={props.onResumeNow}
          onCancelAutoResume={props.onCancelAutoResume}
        />
      </div>
      {!session.isPaused && (
        <LongPressInterruptButton
          label={tr('长按中断', 'Hold to interrupt')}
          onInterrupt={props.onInterruptClick}
        />
      )}
      <FocusModeDialogs
        chainId={chain.id}
        chainName={chain.name}
        isDurationless={props.isDurationless}
        showRuleSelection={props.showRuleSelection}
        pendingActionType={props.pendingActionType}
        sessionContext={props.sessionContext}
        onRuleSelected={props.onRuleSelected}
        onCreateNewRule={props.onCreateNewRule}
        onRuleSelectionCancel={props.onRuleSelectionCancel}
        showCompletionDialog={props.showCompletionDialog}
        onDirectComplete={props.onDirectComplete}
        onCompletionCancel={props.onCompletionCancel}
        showInterruptDialog={props.showInterruptDialog}
        onCancelInterrupt={props.onCancelInterrupt}
        onConfirmInterrupt={props.onConfirmInterrupt}
      />
    </main>
  );
}
