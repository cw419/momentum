import { describe, expect, it, vi } from 'vitest';
import { addToBuffer, processBatchData } from '../buffer';
import { performanceLogger } from '../../performanceLogger';
import type { PerformanceBufferEntry } from '../types';

describe('performance-monitor/buffer', () => {
  it('adds entries and evicts oldest when max size is reached', () => {
    const buffer: PerformanceBufferEntry[] = [];

    addToBuffer(buffer, 2, { type: 'measure', name: 'a', timestamp: 1 });
    addToBuffer(buffer, 2, { type: 'measure', name: 'b', timestamp: 2 });
    addToBuffer(buffer, 2, { type: 'measure', name: 'c', timestamp: 3 });

    expect(buffer).toHaveLength(2);
    expect(buffer.map((entry) => entry.name)).toEqual(['b', 'c']);
  });

  it('returns early when there is no batched data', async () => {
    const requestIdleSpy = vi.fn();
    vi.stubGlobal('requestIdleCallback', requestIdleSpy);

    await processBatchData({
      buffer: [],
      reportingEnabled: true,
      backgroundMode: false,
    });

    expect(requestIdleSpy).not.toHaveBeenCalled();
  });

  it('processes batch data and logs only when reporting is enabled in foreground', async () => {
    const debugSpy = vi.spyOn(performanceLogger, 'debug').mockImplementation(() => undefined);
    let idleCallback: IdleRequestCallback | undefined;

    vi.stubGlobal(
      'requestIdleCallback',
      vi.fn((callback: IdleRequestCallback) => {
        idleCallback = callback;
        return 1;
      })
    );

    const buffer: PerformanceBufferEntry[] = [
      { type: 'paint', name: 'first-paint', timestamp: 1 },
      { type: 'slow-interaction', name: 'save', duration: 150, timestamp: 2 },
    ];

    const promise = processBatchData({
      buffer,
      reportingEnabled: true,
      backgroundMode: false,
    });

    expect(idleCallback).toBeTypeOf('function');
    idleCallback?.({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
    await promise;

    expect(buffer).toHaveLength(0);
    expect(debugSpy).toHaveBeenCalledTimes(1);

    debugSpy.mockClear();
    const anotherBuffer: PerformanceBufferEntry[] = [{ type: 'measure', name: 'layout', timestamp: 3 }];
    let idleCallback2: IdleRequestCallback | undefined;
    vi.stubGlobal(
      'requestIdleCallback',
      vi.fn((callback: IdleRequestCallback) => {
        idleCallback2 = callback;
        return 1;
      })
    );

    const promise2 = processBatchData({
      buffer: anotherBuffer,
      reportingEnabled: true,
      backgroundMode: true,
    });
    idleCallback2?.({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
    await promise2;

    expect(debugSpy).not.toHaveBeenCalled();
  });
});
