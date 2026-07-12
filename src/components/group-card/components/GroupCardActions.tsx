import { AlertTriangle, Bell, Check, Clock, Play } from 'lucide-react';
import type { ChainTreeNode, ScheduledSession } from '../../../types';
import { formatDuration } from '../../../utils/time';

export function GroupCardActions(props: {
  group: ChainTreeNode;
  nextUnit: ChainTreeNode | null;
  scheduledSession: ScheduledSession | null;
  timeRemaining: number;
  onStartChain: (id: string) => void;
  onScheduleChain: (id: string) => void;
  onCancelScheduledSession?: (id: string) => void;
  onCompleteBooking?: (id: string) => void;
  tr: (zh: string, en: string) => string;
}) {
  const targetId = props.nextUnit?.id ?? props.group.id;
  const scheduledSession = props.scheduledSession;
  return (
    <>
      {scheduledSession && (
        <div className="mb-6 rounded-2xl border border-blue-200/50 bg-gradient-to-r from-blue-500/10 to-blue-600/5 p-4 dark:border-blue-400/30 dark:from-blue-500/20 dark:to-blue-600/10">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-blue-600">
              <Bell size={14} />
              <span className="font-chinese text-sm font-medium">
                {props.tr('预约信号: ', 'Signal: ')}
                {scheduledSession.auxiliarySignal}
              </span>
            </div>
            <div className="font-mono text-lg font-bold text-blue-700 dark:text-blue-400">
              {formatDuration(props.timeRemaining)}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                props.onCompleteBooking?.(scheduledSession.chainId);
              }}
              aria-label={props.tr('完成预约', 'Complete booking')}
              className="flex flex-1 items-center justify-center space-x-2 rounded-xl border border-green-200/50 bg-green-500/10 px-3 py-3 text-sm text-green-600 transition-colors duration-200 hover:bg-green-500/20 dark:border-green-400/30 dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/30"
            >
              <Check size={16} aria-hidden="true" />
              <span className="font-chinese font-medium">
                {props.tr('完成预约', 'Complete booking')}
              </span>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                props.onCancelScheduledSession?.(scheduledSession.chainId);
              }}
              aria-label={props.tr('中断/规则判定', 'Interrupt / Adjudicate')}
              className="flex flex-1 items-center justify-center space-x-2 rounded-xl border border-red-200/50 bg-red-500/10 px-3 py-3 text-sm text-red-600 transition-colors duration-200 hover:bg-red-500/20 dark:border-red-400/30 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
            >
              <AlertTriangle size={16} aria-hidden="true" />
              <span className="font-chinese font-medium">
                {props.tr('中断/规则判定', 'Interrupt / Adjudicate')}
              </span>
            </button>
          </div>
        </div>
      )}
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            props.onStartChain(targetId);
          }}
          className="gradient-primary focus-ring flex flex-1 items-center justify-center space-x-2 rounded-2xl px-4 py-3 font-medium text-white shadow-lg transition duration-300 hover:scale-105 hover:shadow-xl"
        >
          <Play size={16} aria-hidden="true" />
          <span className="font-chinese font-semibold">
            {props.tr('开始下一个', 'Start next')}
          </span>
        </button>
        {!scheduledSession && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              props.onScheduleChain(targetId);
            }}
            className="gradient-dark focus-ring flex flex-1 items-center justify-center space-x-2 rounded-2xl px-4 py-3 font-medium text-white shadow-lg transition duration-300 hover:scale-105 hover:shadow-xl"
          >
            <Clock size={16} aria-hidden="true" />
            <span className="font-chinese font-semibold">
              {props.tr('预约', 'Schedule')}
            </span>
          </button>
        )}
      </div>
    </>
  );
}
