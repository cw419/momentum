import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUnitChain } from '../../../test/factories';
import { useViewUrlSync } from '../useViewUrlSync';
import { createInitialUIState, uiStore } from '../../../stores/uiStore';

describe('useViewUrlSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
    uiStore.setState(createInitialUIState());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies URL view state to app state after data is ready', () => {
    const chain = createUnitChain({ id: 'chain-1' });
    window.history.replaceState(null, '', '/?view=detail&chain=chain-1');

    renderHook(() =>
      useViewUrlSync({
        chains: [chain],
        activeSession: null,
        shouldLoadData: true,
        isLoadingData: false,
      }),
    );

    expect(uiStore.getState().currentView).toBe('detail');
    expect(uiStore.getState().viewingChainId).toBe(chain.id);
    expect(uiStore.getState().editingChain).toBeNull();
  });

  it('removes invalid dashboard URL params via replaceState', () => {
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    window.history.replaceState(null, '', '/?view=focus');

    renderHook(() =>
      useViewUrlSync({
        chains: [],
        activeSession: null,
        shouldLoadData: true,
        isLoadingData: false,
      }),
    );

    expect(replaceStateSpy).toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });

  it('pushes URL updates when state navigation changes', () => {
    vi.useFakeTimers();
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const chain = createUnitChain({ id: 'chain-2' });

    renderHook(() =>
      useViewUrlSync({
        chains: [chain],
        activeSession: null,
        shouldLoadData: true,
        isLoadingData: false,
      }),
    );

    vi.runAllTimers();
    pushStateSpy.mockClear();
    act(() => {
      uiStore.setState({
        currentView: 'detail',
        viewingChainId: chain.id,
        editingChain: null,
      });
    });

    expect(pushStateSpy).toHaveBeenCalled();
    expect(window.location.search).toContain('view=detail');
    expect(window.location.search).toContain(`chain=${chain.id}`);
  });

  it('updates state on popstate navigation', () => {
    const chain = createUnitChain({ id: 'chain-pop' });

    renderHook(() =>
      useViewUrlSync({
        chains: [chain],
        activeSession: null,
        shouldLoadData: true,
        isLoadingData: false,
      }),
    );

    window.history.pushState(null, '', `/?view=detail&chain=${chain.id}`);
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(uiStore.getState().currentView).toBe('detail');
    expect(uiStore.getState().viewingChainId).toBe(chain.id);
  });

  it('does not sync URL while data is still loading', () => {
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const chain = createUnitChain({ id: 'chain-loading' });
    uiStore.setState({
      currentView: 'detail',
      viewingChainId: chain.id,
      editingChain: null,
    });

    renderHook(() =>
      useViewUrlSync({
        chains: [chain],
        activeSession: null,
        shouldLoadData: true,
        isLoadingData: true,
      }),
    );

    expect(pushStateSpy).not.toHaveBeenCalled();
  });
});
