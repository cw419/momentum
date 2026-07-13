import { useCallback, useRef, useState } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  delay?: number;
}

interface UseLongPressResult {
  isActive: boolean;
  handlers: {
    onPointerDown: () => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
    onPointerCancel: () => void;
  };
}

/**
 * 长按交互 hook。按住 `delay` ms 后触发 `onLongPress`，
 * 提前松手或移出则取消。
 */
export function useLongPress({
  onLongPress,
  delay = 700,
}: UseLongPressOptions): UseLongPressResult {
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    setIsActive(true);
    timerRef.current = setTimeout(() => {
      setIsActive(false);
      onLongPress();
    }, delay);
  }, [delay, onLongPress]);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
  }, []);

  return {
    isActive,
    handlers: {
      onPointerDown: start,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
    },
  };
}
