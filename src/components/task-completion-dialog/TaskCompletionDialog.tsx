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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-completion-dialog-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-800"
      >
        <TaskCompletionDialogHeader
          chainName={chainName}
          tr={tr}
          onCancel={handleCancel}
        />

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
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
