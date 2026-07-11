import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTaskLifecycleIntegration } from '../useTaskLifecycleIntegration';

const subscribeMock = vi.hoisted(() => vi.fn());

vi.mock('../../../services/task-lifecycle/TaskLifecycleEventBus', () => ({
  taskLifecycleEventBus: { subscribe: subscribeMock },
}));

describe('useTaskLifecycleIntegration', () => {
  it('subscribes, adapts lifecycle events, and unsubscribes on cleanup', async () => {
    const unsubscribe = vi.fn();
    const handleTaskEventIntegration = vi.fn(async () => []);
    subscribeMock.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() =>
      useTaskLifecycleIntegration(handleTaskEventIntegration),
    );
    const listener = subscribeMock.mock.calls[0]?.[0] as (event: {
      type: 'task_completed';
      chainId: string;
      chainKind: 'unit';
      occurredAt: Date;
    }) => Promise<void>;
    const occurredAt = new Date('2026-07-11T10:00:00.000Z');

    await act(() =>
      listener({
        type: 'task_completed',
        chainId: 'chain-1',
        chainKind: 'unit',
        occurredAt,
      }),
    );
    unmount();

    expect(handleTaskEventIntegration).toHaveBeenCalledWith({
      event: 'task_completed',
      chainId: 'chain-1',
      chainKind: 'unit',
      occurredAt,
    });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
