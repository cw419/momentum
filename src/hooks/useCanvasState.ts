import { useState, useEffect, useCallback, useRef } from 'react';
import { localPreferences, type CanvasState } from '../utils/localPreferences';

export type { CanvasState };

const DEBOUNCE_MS = 500;

export function useCanvasState() {
  const [savedState, setSavedState] = useState<CanvasState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const stored = localPreferences.getCanvasState();
    if (stored) {
      setSavedState(stored);
    }
    setIsLoaded(true);
  }, []);

  // Save state to localStorage with debounce
  const saveCanvasState = useCallback((state: CanvasState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      localPreferences.setCanvasState(state);
      setSavedState(state);
    }, DEBOUNCE_MS);
  }, []);

  // Clear saved state
  const clearCanvasState = useCallback(() => {
    localPreferences.clearCanvasState();
    setSavedState(null);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    savedState,
    isLoaded,
    saveCanvasState,
    clearCanvasState,
  };
}
