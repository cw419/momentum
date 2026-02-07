import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasState } from '../useCanvasState';

const localPreferencesMock = vi.hoisted(() => ({
  getCanvasState: vi.fn(),
  setCanvasState: vi.fn(),
  clearCanvasState: vi.fn(),
}));

vi.mock('../../utils/localPreferences', () => ({
  localPreferences: localPreferencesMock,
}));

describe('useCanvasState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    localPreferencesMock.getCanvasState.mockReturnValue(null);
  });

  it('loads saved canvas state on mount', () => {
    localPreferencesMock.getCanvasState.mockReturnValue({
      scale: 1.2,
      positionX: 10,
      positionY: 20,
    });

    const { result } = renderHook(() => useCanvasState());

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.savedState).toEqual({
      scale: 1.2,
      positionX: 10,
      positionY: 20,
    });
  });

  it('debounces save calls and keeps latest state only', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCanvasState());

    act(() => {
      result.current.saveCanvasState({ scale: 1, positionX: 0, positionY: 0 });
      result.current.saveCanvasState({ scale: 2, positionX: 5, positionY: 6 });
    });

    expect(localPreferencesMock.setCanvasState).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(localPreferencesMock.setCanvasState).toHaveBeenCalledTimes(1);
    expect(localPreferencesMock.setCanvasState).toHaveBeenCalledWith({
      scale: 2,
      positionX: 5,
      positionY: 6,
    });
    expect(result.current.savedState).toEqual({
      scale: 2,
      positionX: 5,
      positionY: 6,
    });
  });

  it('clears persisted state', () => {
    const { result } = renderHook(() => useCanvasState());

    act(() => {
      result.current.clearCanvasState();
    });

    expect(localPreferencesMock.clearCanvasState).toHaveBeenCalledTimes(1);
    expect(result.current.savedState).toBeNull();
  });

  it('cancels pending debounce on unmount', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useCanvasState());

    act(() => {
      result.current.saveCanvasState({ scale: 3, positionX: 7, positionY: 8 });
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(localPreferencesMock.setCanvasState).not.toHaveBeenCalled();
  });
});
