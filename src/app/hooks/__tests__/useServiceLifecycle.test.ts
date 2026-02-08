import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useServiceLifecycle } from '../useServiceLifecycle';
import { forwardTimerManager } from '../../../utils/forwardTimer';
import { exceptionRuleCache } from '../../../utils/exceptionRuleCache';
import { ruleStateManager } from '../../../services/RuleStateManager';
import { initializeRuleSystem } from '../../../utils/initializeRuleSystem';
import { runMigration } from '../../../utils/migration';
import { logger } from '../../../utils/logger';

vi.mock('../../../utils/env', () => ({
  isDev: false,
}));

vi.mock('../../../utils/forwardTimer', () => ({
  forwardTimerManager: {
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock('../../../utils/exceptionRuleCache', () => ({
  exceptionRuleCache: {
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock('../../../services/RuleStateManager', () => ({
  ruleStateManager: {
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock('../../../utils/initializeRuleSystem', () => ({
  initializeRuleSystem: vi.fn(async () => ({ success: true, message: 'ok' })),
}));

vi.mock('../../../utils/migration', () => ({
  runMigration: vi.fn(),
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('useServiceLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start services on mount and stop services on unmount', async () => {
    const { result, unmount } = renderHook(() => useServiceLifecycle());

    expect(result.current.isInitialized).toBe(true);
    expect(forwardTimerManager.start).toHaveBeenCalledTimes(1);
    expect(exceptionRuleCache.start).toHaveBeenCalledTimes(1);
    expect(ruleStateManager.start).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(150);
    await Promise.resolve();

    expect(initializeRuleSystem).toHaveBeenCalledTimes(1);
    expect(runMigration).toHaveBeenCalledTimes(1);

    unmount();

    expect(forwardTimerManager.stop).toHaveBeenCalledTimes(1);
    expect(exceptionRuleCache.stop).toHaveBeenCalledTimes(1);
    expect(ruleStateManager.stop).toHaveBeenCalledTimes(1);
  });

  it('should log error when non-critical initialization reports failure', async () => {
    vi.mocked(initializeRuleSystem).mockResolvedValue({
      success: false,
      message: 'init failed',
    });

    renderHook(() => useServiceLifecycle());

    vi.advanceTimersByTime(150);
    await Promise.resolve();

    expect(logger.error).toHaveBeenCalledWith(
      'SERVICE_LIFECYCLE',
      'Rule system initialization failed: init failed',
    );
  });
});
