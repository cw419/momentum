import type { ActiveSession, Chain } from '../../types';
import { CheckCircle, Settings } from 'lucide-react';
import { useI18n } from '../../i18n';

interface FocusModeControlsProps {
  session: ActiveSession;
  chain: Chain;
  isDurationless: boolean;
  hasReachedMinimum: boolean;
  onPauseClick: () => void;
  onEarlyCompleteClick: () => void;

  autoResumeAt: number | null;
  resumeCountdown: number;
  elapsedPauseTime: number;
  onResumeNow: () => void;
  onCancelAutoResume: () => void;
}

export function FocusModeControls({
  session,
  chain,
  isDurationless,
  hasReachedMinimum,
  onPauseClick,
  onEarlyCompleteClick,
  autoResumeAt,
  resumeCountdown,
  elapsedPauseTime,
  onResumeNow,
  onCancelAutoResume,
}: FocusModeControlsProps) {
  const { tr } = useI18n();
  return (
    <>
      {!session.isPaused && (
        <div className="flex items-center justify-center space-x-4">
          {isDurationless ? (
            <>
              <button
                onClick={onPauseClick}
                className="flex items-center space-x-2 rounded-2xl bg-yellow-500/90 px-6 py-3 font-chinese text-white transition duration-300 hover:bg-yellow-500"
              >
                <Settings size={16} />
                <span>{tr('暂停', 'Pause')}</span>
              </button>
              {(!chain.minimumDuration || chain.minimumDuration === 0) && (
                <button
                  onClick={onEarlyCompleteClick}
                  className="flex items-center space-x-2 rounded-3xl bg-green-600 px-8 py-4 font-chinese text-white shadow-lg transition duration-300 hover:bg-green-700"
                >
                  <CheckCircle size={20} />
                  <span>{tr('完成任务', 'Complete')}</span>
                </button>
              )}

              {chain.minimumDuration && chain.minimumDuration > 0 && (
                <>
                  {!hasReachedMinimum ? (
                    <button
                      onClick={onEarlyCompleteClick}
                      className="flex items-center space-x-2 rounded-2xl bg-orange-500 px-6 py-3 font-chinese text-white transition duration-300 hover:bg-orange-600"
                    >
                      <CheckCircle size={16} />
                      <span>{tr('提前完成', 'Complete early')}</span>
                    </button>
                  ) : (
                    <button
                      onClick={onEarlyCompleteClick}
                      className="flex items-center space-x-2 rounded-3xl bg-green-600 px-8 py-4 font-chinese text-white shadow-lg transition duration-300 hover:bg-green-700"
                    >
                      <CheckCircle size={20} />
                      <span>{tr('完成任务', 'Complete')}</span>
                    </button>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <button
                onClick={onPauseClick}
                className="flex items-center space-x-2 rounded-2xl bg-yellow-500/90 px-6 py-3 font-chinese text-white transition duration-300 hover:bg-yellow-500"
              >
                <Settings size={16} />
                <span>{tr('暂停', 'Pause')}</span>
              </button>
              <button
                onClick={onEarlyCompleteClick}
                className="flex items-center space-x-2 rounded-2xl bg-green-600 px-6 py-3 font-chinese text-white transition duration-300 hover:bg-green-700"
              >
                <CheckCircle size={16} />
                <span>{tr('提前完成', 'Complete early')}</span>
              </button>
            </>
          )}
        </div>
      )}

      {session.isPaused && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="font-chinese text-gray-700 dark:text-gray-300">
            {autoResumeAt
              ? tr(
                  `已暂停，将于 ${Math.floor(resumeCountdown / 60)}分${resumeCountdown % 60}秒 内自动继续`,
                  `Paused. Auto-resume in ${Math.floor(resumeCountdown / 60)}m ${resumeCountdown % 60}s`,
                )
              : tr(
                  `已暂停 ${Math.floor(elapsedPauseTime / 60)}分${elapsedPauseTime % 60}秒`,
                  `Paused for ${Math.floor(elapsedPauseTime / 60)}m ${elapsedPauseTime % 60}s`,
                )}
          </div>
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={onResumeNow}
              className="rounded-2xl bg-green-600 px-6 py-3 font-chinese text-white transition duration-300 hover:bg-green-700"
            >
              {tr('继续', 'Resume')}
            </button>
            {autoResumeAt && (
              <button
                onClick={onCancelAutoResume}
                className="rounded-2xl bg-gray-200 px-6 py-3 font-chinese text-gray-900 transition duration-300 hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
              >
                {tr('取消自动继续', 'Cancel auto-resume')}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
