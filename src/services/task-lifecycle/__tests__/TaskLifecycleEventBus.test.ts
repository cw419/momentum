import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TaskLifecycleEventBus,
  taskLifecycleEventBus,
} from '../TaskLifecycleEventBus';
import type { TaskLifecycleEvent } from '../../../types';

const event: TaskLifecycleEvent = {
  type: 'task_completed',
  chainId: 'chain-1',
  chainKind: 'unit',
  occurredAt: new Date('2026-07-11T10:00:00.000Z'),
};

describe('TaskLifecycleEventBus', () => {
  beforeEach(() => {
    taskLifecycleEventBus.reset();
  });

  it('publishes lifecycle events to all subscribers', async () => {
    const bus = new TaskLifecycleEventBus();
    const first = vi.fn();
    const second = vi.fn(async () => undefined);
    bus.subscribe(first);
    bus.subscribe(second);

    bus.publish(event);
    await Promise.resolve();

    expect(first).toHaveBeenCalledWith(event);
    expect(second).toHaveBeenCalledWith(event);
  });

  it('unsubscribes listeners and resets the singleton', () => {
    const listener = vi.fn();
    const unsubscribe = taskLifecycleEventBus.subscribe(listener);

    unsubscribe();
    taskLifecycleEventBus.publish(event);
    taskLifecycleEventBus.subscribe(listener);
    taskLifecycleEventBus.reset();
    taskLifecycleEventBus.publish(event);

    expect(listener).not.toHaveBeenCalled();
  });

  it('isolates a rejecting listener from healthy listeners', async () => {
    const bus = new TaskLifecycleEventBus();
    const healthy = vi.fn();
    bus.subscribe(async () => {
      throw new Error('listener failed');
    });
    bus.subscribe(healthy);

    bus.publish(event);
    await Promise.resolve();
    await Promise.resolve();

    expect(healthy).toHaveBeenCalledWith(event);
  });
});
