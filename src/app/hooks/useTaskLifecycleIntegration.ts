import { useEffect } from 'react';
import type { RSIPTaskEventPayload } from '../../types';
import { taskLifecycleEventBus } from '../../services/task-lifecycle/TaskLifecycleEventBus';

type TaskEventIntegrationHandler = (
  payload: RSIPTaskEventPayload,
) => unknown | Promise<unknown>;

export function useTaskLifecycleIntegration(
  handleTaskEventIntegration: TaskEventIntegrationHandler,
): void {
  useEffect(
    () =>
      taskLifecycleEventBus.subscribe(async (event) => {
        await handleTaskEventIntegration({
          event: event.type,
          chainId: event.chainId,
          chainKind: event.chainKind,
          occurredAt: event.occurredAt,
        });
      }),
    [handleTaskEventIntegration],
  );
}
