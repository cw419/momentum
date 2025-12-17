import type { ActiveSession, Chain } from '../../types';
import { CheckCircle, Settings } from 'lucide-react';

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
                <span>暂停</span>
              </button>
              {(!chain.minimumDuration || chain.minimumDuration === 0) && (
                <button
                  onClick={onEarlyCompleteClick}
                  className="px-8 py-4 rounded-3xl bg-green-600 hover:bg-green-700 text-white font-chinese transition-all duration-300 shadow-lg flex items-center space-x-2"
                >
                  <CheckCircle size={20} />
                  <span>完成任务</span>
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
                      <span>提前完成</span>
                    </button>
                  ) : (
                    <button
                      onClick={onEarlyCompleteClick}
                      className="px-8 py-4 rounded-3xl bg-green-600 hover:bg-green-700 text-white font-chinese transition-all duration-300 shadow-lg flex items-center space-x-2"
                    >
                      <CheckCircle size={20} />
                      <span>完成任务</span>
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
                <span>暂停</span>
              </button>
              <button
                onClick={onEarlyCompleteClick}
                className="px-6 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-chinese transition-all duration-300 flex items-center space-x-2"
              >
                <CheckCircle size={16} />
                <span>提前完成</span>
              </button>
            </>
          )}
        </div>
      )}

      {session.isPaused && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="text-gray-700 dark:text-gray-300 font-chinese">
            {autoResumeAt
              ? `已暂停，将于 ${Math.floor(resumeCountdown / 60)}分${resumeCountdown % 60}秒 内自动继续`
              : `已暂停 ${Math.floor(elapsedPauseTime / 60)}分${elapsedPauseTime % 60}秒`}
          </div>
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={onResumeNow}
              className="px-6 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-chinese transition-all duration-300"
            >
              继续
            </button>
            {autoResumeAt && (
              <button
                onClick={onCancelAutoResume}
                className="px-6 py-3 rounded-2xl bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-chinese transition-all duration-300"
              >
                取消自动继续
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

