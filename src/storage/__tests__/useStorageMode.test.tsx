import { renderHook } from '@testing-library/react';
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  StorageModeContext,
  type StorageModeContextValue,
} from '../storageModeContextValue';
import { useStorageMode } from '../useStorageMode';

const contextValue: StorageModeContextValue = {
  mode: 'local',
  canUseSupabase: true,
  isChoicePending: true,
  setMode: () => undefined,
  dismissFirstLaunchHint: () => undefined,
};

class HookErrorBoundary extends Component<
  {
    children: ReactNode;
    onError: (error: Error, errorInfo: ErrorInfo) => void;
  },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError(error, errorInfo);
  }

  override render() {
    return this.state.hasError ? null : this.props.children;
  }
}

describe('useStorageMode', () => {
  it('returns context value when provider is present', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StorageModeContext.Provider value={contextValue}>
        {children}
      </StorageModeContext.Provider>
    );

    const { result } = renderHook(() => useStorageMode(), { wrapper });
    expect(result.current).toBe(contextValue);
  });

  it('throws when provider is missing', () => {
    const onError = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <HookErrorBoundary onError={onError}>{children}</HookErrorBoundary>
    );
    const suppressExpectedError = (event: ErrorEvent) => {
      if (
        event.error instanceof Error &&
        event.error.message ===
          'useStorageMode must be used within a StorageProvider'
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('error', suppressExpectedError);
    try {
      renderHook(() => useStorageMode(), { wrapper });
    } finally {
      window.removeEventListener('error', suppressExpectedError);
    }

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'useStorageMode must be used within a StorageProvider',
      }),
      expect.any(Object),
    );
  });
});
