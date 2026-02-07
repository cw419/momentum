import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createAppState, createUnitChain } from '../../../test/factories';
import { useViewUrlSync } from '../useViewUrlSync';

describe('useViewUrlSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies URL view state to app state after data is ready', () => {
    const chain = createUnitChain({ id: 'chain-1' });
    const setState = vi.fn();
    window.history.replaceState(null, '', '/?view=detail&chain=chain-1');

    renderHook(() =>
      useViewUrlSync({
        state: createAppState({ chains: [chain] }),
        setState,
        shouldLoadData: true,
        isLoadingData: false,
      }),
    );

    expect(setState).toHaveBeenCalledWith(expect.any(Function));
    const updater = setState.mock.calls[0]?.[0] as (prev: ReturnType<typeof createAppState>) => ReturnType<typeof createAppState>;
    const next = updater(createAppState());
    expect(next.currentView).toBe('detail');
    expect(next.viewingChainId).toBe(chain.id);
    expect(next.editingChain).toBeNull();
  });

  it('removes invalid dashboard URL params via replaceState', () => {
    const setState = vi.fn();
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    window.history.replaceState(null, '', '/?view=focus');

    renderHook(() =>
      useViewUrlSync({
        state: createAppState({ chains: [] }),
        setState,
        shouldLoadData: true,
        isLoadingData: false,
      }),
    );

    expect(replaceStateSpy).toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });

  it('pushes URL updates when state navigation changes', () => {
    vi.useFakeTimers();
    const setState = vi.fn();
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const chain = createUnitChain({ id: 'chain-2' });

    const { rerender } = renderHook(
      ({ state }) =>
        useViewUrlSync({
          state,
          setState,
          shouldLoadData: true,
          isLoadingData: false,
        }),
      {
        initialProps: { state: createAppState({ chains: [chain], currentView: 'dashboard' }) },
      },
    );

    vi.runAllTimers();
    pushStateSpy.mockClear();
    rerender({
      state: createAppState({
        chains: [chain],
        currentView: 'detail',
        viewingChainId: chain.id,
      }),
    });

    expect(pushStateSpy).toHaveBeenCalled();
    expect(window.location.search).toContain('view=detail');
    expect(window.location.search).toContain(`chain=${chain.id}`);
  });

  it('updates state on popstate navigation', () => {
    const chain = createUnitChain({ id: 'chain-pop' });
    const setState = vi.fn();

    renderHook(() =>
      useViewUrlSync({
        state: createAppState({ chains: [chain] }),
        setState,
        shouldLoadData: true,
        isLoadingData: false,
      }),
    );

    setState.mockClear();
    window.history.pushState(null, '', `/?view=detail&chain=${chain.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(setState).toHaveBeenCalledWith(expect.any(Function));
    const updater = setState.mock.calls[0]?.[0] as (prev: ReturnType<typeof createAppState>) => ReturnType<typeof createAppState>;
    const next = updater(createAppState());
    expect(next.currentView).toBe('detail');
    expect(next.viewingChainId).toBe(chain.id);
  });

  it('does not sync URL while data is still loading', () => {
    const setState = vi.fn();
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const chain = createUnitChain({ id: 'chain-loading' });

    renderHook(() =>
      useViewUrlSync({
        state: createAppState({
          chains: [chain],
          currentView: 'detail',
          viewingChainId: chain.id,
        }),
        setState,
        shouldLoadData: true,
        isLoadingData: true,
      }),
    );

    expect(pushStateSpy).not.toHaveBeenCalled();
  });
});
