import React from 'react';
import { useI18n } from '../../i18n';
import { NotesSection } from './components/NotesSection';
import { TaskCompletionDialogFooter } from './components/TaskCompletionDialogFooter';
import { TaskCompletionDialogHeader } from './components/TaskCompletionDialogHeader';
import { TaskDescriptionSection } from './components/TaskDescriptionSection';
import { useTaskCompletionDialog } from './hooks/useTaskCompletionDialog';

interface TaskCompletionDialogProps {
  isOpen: boolean;
  chainName: string;
  chainId: string;
  isDurationless?: boolean;
  onComplete: (description: string, notes?: string) => void;
  onCancel: () => void;
}

export const TaskCompletionDialog: React.FC<TaskCompletionDialogProps> = ({
  isOpen,
  chainName,
  chainId,
  isDurationless = false,
  onComplete,
  onCancel,
}) => {
  const { tr } = useI18n();

  const {
    description,
    setDescription,
    notes,
    setNotes,
    isNotesVisible,
    recentDescriptions,
    showQuickFill,
    descriptionInputRef,
    notesTextareaRef,
    handleSubmit,
    handleCancel,
    showNotes,
    toggleQuickFill,
    handleQuickFill,
    handleDescriptionKeyDown,
    handleNotesKeyDown,
  } = useTaskCompletionDialog({
    isOpen,
    chainId,
    isDurationless,
    onComplete,
    onCancel,
  });

  if (!isOpen) return null;

  const disableComplete = isDurationless && !description.trim();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-completion-dialog-title"
        className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <TaskCompletionDialogHeader chainName={chainName} tr={tr} onCancel={handleCancel} />

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <TaskDescriptionSection
            tr={tr}
            isDurationless={isDurationless}
            description={description}
            onDescriptionChange={setDescription}
            onDescriptionKeyDown={handleDescriptionKeyDown}
            descriptionInputRef={descriptionInputRef}
            recentDescriptions={recentDescriptions}
            showQuickFill={showQuickFill}
            onToggleQuickFill={toggleQuickFill}
            onQuickFill={handleQuickFill}
          />

          <NotesSection
            tr={tr}
            isVisible={isNotesVisible}
            notes={notes}
            onNotesChange={setNotes}
            onNotesKeyDown={handleNotesKeyDown}
            notesTextareaRef={notesTextareaRef}
            onShowNotes={showNotes}
          />
        </div>

        <TaskCompletionDialogFooter
          tr={tr}
          disableComplete={disableComplete}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

