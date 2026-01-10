import { useState, useEffect, useCallback, useRef } from 'react';

export interface CanvasState {
  scale: number;
  positionX: number;
  positionY: number;
}

const STORAGE_KEY = 'momentum:rsip-canvas-state';
const DEBOUNCE_MS = 500;

export function useCanvasState() {
  const [savedState, setSavedState] = useState<CanvasState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CanvasState;
        if (
          typeof parsed.scale === 'number' &&
          typeof parsed.positionX === 'number' &&
          typeof parsed.positionY === 'number'
        ) {
          setSavedState(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    }
    setIsLoaded(true);
  }, []);

  // Save state to localStorage with debounce
  const saveCanvasState = useCallback((state: CanvasState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setSavedState(state);
      } catch {
        // Ignore storage errors
      }
    }, DEBOUNCE_MS);
  }, []);

  // Clear saved state
  const clearCanvasState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSavedState(null);
    } catch {
      // Ignore storage errors
    }
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
