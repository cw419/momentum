import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createLocalStorageMock } from '../../test/factories';
import { StorageContext } from '../storageContextValue';
import { useStorage } from '../useStorage';

describe('useStorage', () => {
  it('should return storage instance when used inside provider', () => {
    const storage = createLocalStorageMock();

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        StorageContext.Provider,
        { value: storage },
        children,
      );

    const { result } = renderHook(() => useStorage(), { wrapper });

    expect(result.current).toBe(storage);
  });
});
