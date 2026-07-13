import type { ChainTreeNode, ScheduledSession } from '../../../types';
import { ChainExecutionActions } from '../../shared/ChainExecutionActions';

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
    <ChainExecutionActions
      scheduled={
        scheduledSession
          ? {
              signal: scheduledSession.auxiliarySignal,
              timeRemaining: props.timeRemaining,
            }
          : undefined
      }
      signalPrefix={props.tr('预约信号: ', 'Signal: ')}
      completeLabel={props.tr('完成预约', 'Complete booking')}
      interruptLabel={props.tr('中断/规则判定', 'Interrupt / Adjudicate')}
      startLabel={props.tr('开始下一个', 'Start next')}
      scheduleLabel={props.tr('预约', 'Schedule')}
      onComplete={() =>
        scheduledSession && props.onCompleteBooking?.(scheduledSession.chainId)
      }
      onInterrupt={() =>
        scheduledSession &&
        props.onCancelScheduledSession?.(scheduledSession.chainId)
      }
      onStart={() => props.onStartChain(targetId)}
      onSchedule={() => props.onScheduleChain(targetId)}
    />
  );
}
