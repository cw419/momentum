import { useEffect, useState } from 'react';

interface VirtualKeyboardState {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
}

const HIDDEN_KEYBOARD: VirtualKeyboardState = {
  keyboardHeight: 0,
  isKeyboardVisible: false,
};

export function useVirtualKeyboard(): VirtualKeyboardState {
  const [state, setState] = useState(HIDDEN_KEYBOARD);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboard = () => {
      const keyboardHeight = Math.max(
        0,
        window.innerHeight - viewport.height - (viewport.offsetTop ?? 0),
      );
      setState({
        keyboardHeight,
        isKeyboardVisible: keyboardHeight > 0,
      });
    };

    viewport.addEventListener('resize', updateKeyboard);
    updateKeyboard();

    return () => viewport.removeEventListener('resize', updateKeyboard);
  }, []);

  return state;
}
