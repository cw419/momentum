import type React from 'react';
import { useEffect, useRef } from 'react';

export function useDialogFocusRestore(params: {
  isOpen: boolean;
  dialogRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
}) {
  const { isOpen, dialogRef, onClose } = params;
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      const cancelButton = dialogRef.current.querySelector(
        '[data-cancel-button]',
      ) as HTMLElement;
      cancelButton?.focus();
    } else if (!isOpen && previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus();
      previouslyFocusedRef.current = null;
    }
  }, [dialogRef, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
}
