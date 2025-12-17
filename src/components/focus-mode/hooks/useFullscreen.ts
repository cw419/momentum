import { useCallback, useEffect, useState } from 'react';
import { logger } from '../../../utils/logger';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => {
    if (typeof document === 'undefined') return false;
    return !!document.fullscreenElement;
  });

  const enterFullscreen = useCallback(async () => {
    try {
      if (typeof document === 'undefined') return;
      await document.documentElement.requestFullscreen();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('FOCUS_MODE', 'Failed to enter fullscreen', undefined, err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (typeof document === 'undefined') return;
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('FOCUS_MODE', 'Failed to exit fullscreen', undefined, err);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) {
      void exitFullscreen();
    } else {
      void enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        void exitFullscreen();
      } else if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [exitFullscreen, toggleFullscreen]);

  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen };
}

