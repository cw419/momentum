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
                className="px-6 py-3 rounded-2xl bg-yellow-500/90 hover:bg-yellow-500 text-white font-chinese transition-all duration-300 flex items-center space-x-2"
              >
                <Settings size={16} />
                <span>{tr('暂停', 'Pause')}</span>
              </button>
              {(!chain.minimumDuration || chain.minimumDuration === 0) && (
                <button
                  onClick={onEarlyCompleteClick}
                  className="px-8 py-4 rounded-3xl bg-green-600 hover:bg-green-700 text-white font-chinese transition-all duration-300 shadow-lg flex items-center space-x-2"
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
                      className="px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-chinese transition-all duration-300 flex items-center space-x-2"
                    >
                      <CheckCircle size={16} />
                      <span>{tr('提前完成', 'Complete early')}</span>
                    </button>
                  ) : (
                    <button
                      onClick={onEarlyCompleteClick}
                      className="px-8 py-4 rounded-3xl bg-green-600 hover:bg-green-700 text-white font-chinese transition-all duration-300 shadow-lg flex items-center space-x-2"
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
                className="px-6 py-3 rounded-2xl bg-yellow-500/90 hover:bg-yellow-500 text-white font-chinese transition-all duration-300 flex items-center space-x-2"
              >
                <Settings size={16} />
                <span>{tr('暂停', 'Pause')}</span>
              </button>
              <button
                onClick={onEarlyCompleteClick}
                className="px-6 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-chinese transition-all duration-300 flex items-center space-x-2"
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
          <div className="text-gray-700 dark:text-gray-300 font-chinese">
            {autoResumeAt
              ? tr(
                `已暂停，将于 ${Math.floor(resumeCountdown / 60)}分${resumeCountdown % 60}秒 内自动继续`,
                `Paused. Auto-resume in ${Math.floor(resumeCountdown / 60)}m ${resumeCountdown % 60}s`
              )
              : tr(
                `已暂停 ${Math.floor(elapsedPauseTime / 60)}分${elapsedPauseTime % 60}秒`,
                `Paused for ${Math.floor(elapsedPauseTime / 60)}m ${elapsedPauseTime % 60}s`
              )}
          </div>
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={onResumeNow}
              className="px-6 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-chinese transition-all duration-300"
            >
              {tr('继续', 'Resume')}
            </button>
            {autoResumeAt && (
              <button
                onClick={onCancelAutoResume}
                className="px-6 py-3 rounded-2xl bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-chinese transition-all duration-300"
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

