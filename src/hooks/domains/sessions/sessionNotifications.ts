import { systemNotificationService } from '../../../services/platform/SystemNotificationService';
import { fireAndForget } from '../../../utils/fireAndForget';

export function notifyTaskCompleted(
  taskName: string,
  streak: number,
  message?: string,
): void {
  const notification = message
    ? systemNotificationService.notifyTaskCompleted(taskName, streak, message)
    : systemNotificationService.notifyTaskCompleted(taskName, streak);
  fireAndForget(notification, { label: 'task-completed-notification' });
}

export function notifyTaskFailed(taskName: string, message: string): void {
  fireAndForget(systemNotificationService.notifyTaskFailed(taskName, message), {
    label: 'task-failed-notification',
  });
}
