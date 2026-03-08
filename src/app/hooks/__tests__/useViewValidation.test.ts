import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createUnitChain } from '../../../test/factories';
import { useViewValidation } from '../useViewValidation';
import {
  appShellStore,
  createInitialAppShellState,
} from '../../../stores/appShellStore';

describe('useViewValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appShellStore.setState(createInitialAppShellState());
  });

  it('should redirect focus view to dashboard when active chain is missing', () => {
    appShellStore.getState().navigateToView('focus');
    const { rerender } = renderHook(
      ({ chains, activeSession, isInitialized }) =>
        useViewValidation({ chains, activeSession, isInitialized }),
      {
        initialProps: {
          chains: [],
          activeSession: {
            chainId: 'missing-chain',
            startedAt: new Date(),
            duration: 20,
            isPaused: false,
            totalPausedTime: 0,
          },
          isInitialized: false,
        },
      },
    );

    rerender({
      chains: [],
      activeSession: {
        chainId: 'missing-chain',
        startedAt: new Date(),
        duration: 20,
        isPaused: false,
        totalPausedTime: 0,
      },
      isInitialized: true,
    });

    expect(appShellStore.getState().currentView).toBe('dashboard');
    expect(appShellStore.getState().viewingChainId).toBeNull();
  });

  it('should redirect detail/group view when viewing chain is missing', () => {
    appShellStore.setState({
      currentView: 'detail',
      viewingChainId: 'missing-chain',
    });

    renderHook(() =>
      useViewValidation({ chains: [], activeSession: null, isInitialized: true }),
    );

    expect(appShellStore.getState().currentView).toBe('dashboard');
    expect(appShellStore.getState().viewingChainId).toBeNull();
  });

  it('should keep current view when state is valid', () => {
    const chain = createUnitChain({ id: 'chain-1' });
    appShellStore.setState({
      currentView: 'group',
      viewingChainId: chain.id,
    });

    renderHook(() =>
      useViewValidation({
        chains: [chain],
        activeSession: null,
        isInitialized: true,
      }),
    );

    expect(appShellStore.getState().currentView).toBe('group');
    expect(appShellStore.getState().viewingChainId).toBe(chain.id);
  });
});
