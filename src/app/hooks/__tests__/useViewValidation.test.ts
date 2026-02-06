import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createAppState, createUnitChain } from '../../../test/factories';
import { useViewValidation } from '../useViewValidation';

describe('useViewValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect focus view to dashboard when active chain is missing', () => {
    const setState = vi.fn();
    const { rerender } = renderHook(
      ({ state, isInitialized }) => useViewValidation({ state, setState, isInitialized }),
      {
        initialProps: {
          state: createAppState({
            currentView: 'focus',
            activeSession: {
              chainId: 'missing-chain',
              startedAt: new Date(),
              duration: 20,
              isPaused: false,
              totalPausedTime: 0,
            },
          }),
          isInitialized: false,
        },
      }
    );

    rerender({
      state: createAppState({
        currentView: 'focus',
        activeSession: {
          chainId: 'missing-chain',
          startedAt: new Date(),
          duration: 20,
          isPaused: false,
          totalPausedTime: 0,
        },
      }),
      isInitialized: true,
    });

    expect(setState).toHaveBeenCalledWith(expect.any(Function));
    const updater = setState.mock.calls[0]?.[0] as (prev: ReturnType<typeof createAppState>) => ReturnType<typeof createAppState>;
    const next = updater(createAppState({ currentView: 'focus', viewingChainId: 'x' }));
    expect(next.currentView).toBe('dashboard');
    expect(next.viewingChainId).toBeNull();
  });

  it('should redirect detail/group view when viewing chain is missing', () => {
    const setState = vi.fn();
    const state = createAppState({
      currentView: 'detail',
      viewingChainId: 'missing-chain',
    });

    renderHook(() => useViewValidation({ state, setState, isInitialized: true }));

    expect(setState).toHaveBeenCalledWith(expect.any(Function));
    const updater = setState.mock.calls[0]?.[0] as (prev: ReturnType<typeof createAppState>) => ReturnType<typeof createAppState>;
    const next = updater(createAppState({ currentView: 'detail', viewingChainId: 'missing-chain' }));
    expect(next.currentView).toBe('dashboard');
    expect(next.viewingChainId).toBeNull();
  });

  it('should keep current view when state is valid', () => {
    const setState = vi.fn();
    const chain = createUnitChain({ id: 'chain-1' });
    const state = createAppState({
      chains: [chain],
      currentView: 'group',
      viewingChainId: chain.id,
    });

    renderHook(() => useViewValidation({ state, setState, isInitialized: true }));

    expect(setState).not.toHaveBeenCalled();
  });
});
