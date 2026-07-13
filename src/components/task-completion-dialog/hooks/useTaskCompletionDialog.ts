import { useCallback, useEffect, useRef, useState } from 'react';
import { useStorage } from '../../../storage/useStorage';
import { logger } from '../../../utils/logger';
import { toError } from '../../../utils/errorMessage';

export function useTaskCompletionDialog(params: {
  isOpen: boolean;
  chainId: string;
  isDurationless: boolean;
  onComplete: (description: string, notes?: string) => void;
  onCancel: () => void;
}) {
  const { isOpen, chainId, isDurationless, onComplete, onCancel } = params;

  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isNotesVisible, setIsNotesVisible] = useState(false);
  const [recentDescriptions, setRecentDescriptions] = useState<string[]>([]);
  const [showQuickFill, setShowQuickFill] = useState(false);

  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  const storage = useStorage();

  useEffect(() => {
    if (!isOpen || !chainId) return;

    let isActive = true;
    const loadRecentDescriptions = async () => {
      try {
        const history = await storage.getCompletionHistory();
        const chainHistory = history
          .filter(
            (h) => h.chainId === chainId && h.wasSuccessful && h.description,
          )
          .sort(
            (a, b) =>
              new Date(b.completedAt).getTime() -
              new Date(a.completedAt).getTime(),
          )
          .slice(0, 5);

        const descriptions = chainHistory
          .map((h) => h.description!)
          .filter(Boolean);
        const uniqueDescriptions = Array.from(new Set(descriptions));
        if (isActive) setRecentDescriptions(uniqueDescriptions);
      } catch (error) {
        logger.error(
          'TASK_COMPLETION',
          'Failed to load recent descriptions',
          { chainId },
          toError(error),
        );
      }
    };

    void loadRecentDescriptions();
    return () => {
      isActive = false;
    };
  }, [isOpen, chainId, storage]);

  const sanitizeInput = useCallback((input: string): string => {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }, []);

  const resetForm = useCallback(() => {
    setDescription('');
    setNotes('');
    setIsNotesVisible(false);
    setShowQuickFill(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (isDurationless && !description.trim()) {
      return;
    }

    const sanitizedDescription = sanitizeInput(description);
    const sanitizedNotes = notes.trim() ? sanitizeInput(notes) : undefined;

    onComplete(sanitizedDescription || '', sanitizedNotes);
    resetForm();
  }, [
    description,
    isDurationless,
    notes,
    onComplete,
    resetForm,
    sanitizeInput,
  ]);

  const handleCancel = useCallback(() => {
    resetForm();
    onCancel();
  }, [onCancel, resetForm]);

  const showNotes = useCallback(() => {
    setIsNotesVisible(true);
    window.setTimeout(() => {
      notesTextareaRef.current?.focus();
    }, 100);
  }, []);

  const toggleQuickFill = useCallback(() => {
    setShowQuickFill((prev) => !prev);
  }, []);

  const handleQuickFill = useCallback((desc: string) => {
    setDescription(desc);
    setShowQuickFill(false);
    descriptionInputRef.current?.focus();
  }, []);

  const handleDescriptionKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        if (event.shiftKey) {
          setShowQuickFill((prev) => !prev);
        } else {
          if (description.trim()) {
            showNotes();
          } else if (recentDescriptions.length > 0) {
            setDescription(recentDescriptions[0]);
          }
        }
      } else if (event.key === 'Enter') {
        event.preventDefault();
        handleSubmit();
      }
    },
    [description, handleSubmit, recentDescriptions, showNotes],
  );

  const handleNotesKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return {
    description,
    setDescription,
    notes,
    setNotes,
    isNotesVisible,
    setIsNotesVisible,
    recentDescriptions,
    showQuickFill,
    setShowQuickFill,
    descriptionInputRef,
    notesTextareaRef,
    handleSubmit,
    handleCancel,
    showNotes,
    toggleQuickFill,
    handleQuickFill,
    handleDescriptionKeyDown,
    handleNotesKeyDown,
  };
}
