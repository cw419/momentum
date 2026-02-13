import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
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
    expect(() => renderHook(() => useStorageMode())).toThrowError(
      'useStorageMode must be used within a StorageProvider',
    );
  });
});
