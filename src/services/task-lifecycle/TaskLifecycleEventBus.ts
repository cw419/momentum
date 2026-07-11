import type { TaskLifecycleEvent } from '../../types';
import { normalizeUnknownError } from '../../utils/errors/normalizeError';
import { logger } from '../../utils/logger';

type TaskLifecycleEventListener = (
  event: TaskLifecycleEvent,
) => void | Promise<void>;

export interface TaskLifecycleEventPublisher {
  publish(event: TaskLifecycleEvent): void;
}

export class TaskLifecycleEventBus implements TaskLifecycleEventPublisher {
  private readonly listeners = new Set<TaskLifecycleEventListener>();

  subscribe(listener: TaskLifecycleEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(event: TaskLifecycleEvent): void {
    for (const listener of this.listeners) {
      void Promise.resolve()
        .then(() => listener(event))
        .catch((error) => {
          logger.warn(
            'TASK_LIFECYCLE',
            'Task lifecycle event listener failed',
            { ...event },
            normalizeUnknownError(error),
          );
        });
    }
  }

  reset(): void {
    this.listeners.clear();
  }
}

export const taskLifecycleEventBus = new TaskLifecycleEventBus();
