import { Pause, Play, Target, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ActiveSession, Chain } from '../types';
import { formatDuration, formatElapsedTime } from '../utils/time';
import { useI18n } from '../i18n';

interface ActiveSessionBarProps {
  session: ActiveSession;
  chain: Chain;
  onOpenFocus: () => void;
  onPause: () => void;
  onResume: () => void;
  isMobile?: boolean;
}

function getElapsedSeconds(session: ActiveSession, now: number): number {
  const endTime = session.isPaused ? (session.pausedAt?.getTime() ?? now) : now;
  return Math.max(
    0,
    Math.floor(
      (endTime - session.startedAt.getTime() - (session.totalPausedTime ?? 0)) /
        1000,
    ),
  );
}

export function ActiveSessionBar({
  session,
  chain,
  onOpenFocus,
  onPause,
  onResume,
  isMobile = false,
}: ActiveSessionBarProps) {
  const { tr } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  const isDurationless = Boolean(
    chain.isDurationless || session.duration === 0,
  );

  useEffect(() => {
    setNow(Date.now());
    if (session.isPaused) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [session.isPaused, session.startedAt]);

  const elapsedSeconds = getElapsedSeconds(session, now);
  const timeLabel = isDurationless
    ? formatElapsedTime(elapsedSeconds)
    : formatDuration(Math.max(0, session.duration * 60 - elapsedSeconds));

  return (
    <aside
      className={`fixed inset-x-3 z-40 mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-primary-200 bg-white/95 px-3 py-2.5 shadow-xl backdrop-blur dark:border-primary-800/70 dark:bg-slate-900/95 sm:bottom-5 sm:px-4 ${isMobile ? 'bottom-20' : 'bottom-3'}`}
      aria-label={tr('正在进行的计时任务', 'Active timed task')}
      data-testid="active-session-bar"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
        <Timer size={18} aria-hidden="true" />
      </div>
      <button
        type="button"
        onClick={onOpenFocus}
        className="min-w-0 flex-1 text-left"
        title={tr('返回专注模式', 'Return to Focus Mode')}
      >
        <span className="block truncate font-chinese text-sm font-semibold text-gray-900 dark:text-slate-100">
          {chain.name}
        </span>
        <span className="block font-mono text-sm text-primary-700 dark:text-primary-300">
          {session.isPaused
            ? tr(`已暂停 · ${timeLabel}`, `Paused · ${timeLabel}`)
            : isDurationless
              ? tr(`已计时 ${timeLabel}`, `Elapsed ${timeLabel}`)
              : tr(`剩余 ${timeLabel}`, `${timeLabel} remaining`)}
        </span>
      </button>
      <button
        type="button"
        onClick={session.isPaused ? onResume : onPause}
        className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-700 transition hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label={
          session.isPaused
            ? tr('继续计时', 'Resume timer')
            : tr('暂停计时', 'Pause timer')
        }
        title={
          session.isPaused
            ? tr('继续计时', 'Resume timer')
            : tr('暂停计时', 'Pause timer')
        }
      >
        {session.isPaused ? <Play size={17} /> : <Pause size={17} />}
      </button>
      <button
        type="button"
        onClick={onOpenFocus}
        className="focus-ring hidden items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-700 sm:flex"
      >
        <Target size={16} aria-hidden="true" />
        {tr('专注页', 'Focus')}
      </button>
    </aside>
  );
}
