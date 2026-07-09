import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createUnitChain } from '../../../test/factories';
import { useViewValidation } from '../useViewValidation';
import {
  navigationStore,
  createInitialNavigationState,
} from '../../../stores/navigationStore';

describe('useViewValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationStore.setState(createInitialNavigationState());
  });

  it('should redirect focus view to dashboard when active chain is missing', () => {
    navigationStore.getState().navigateToView('focus');
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

    expect(navigationStore.getState().currentView).toBe('dashboard');
    expect(navigationStore.getState().viewingChainId).toBeNull();
  });

  it('should redirect detail/group view when viewing chain is missing', () => {
    navigationStore.setState({
      currentView: 'detail',
      viewingChainId: 'missing-chain',
    });

    renderHook(() =>
      useViewValidation({ chains: [], activeSession: null, isInitialized: true }),
    );

    expect(navigationStore.getState().currentView).toBe('dashboard');
    expect(navigationStore.getState().viewingChainId).toBeNull();
  });

  it('should keep current view when state is valid', () => {
    const chain = createUnitChain({ id: 'chain-1' });
    navigationStore.setState({
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

    expect(navigationStore.getState().currentView).toBe('group');
    expect(navigationStore.getState().viewingChainId).toBe(chain.id);
  });
});
