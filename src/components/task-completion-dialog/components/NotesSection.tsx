import React from 'react';
import { MessageSquare } from 'lucide-react';

export const NotesSection: React.FC<{
  tr: (zh: string, en: string) => string;
  isVisible: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
  onNotesKeyDown: (event: React.KeyboardEvent) => void;
  notesTextareaRef: React.RefObject<HTMLTextAreaElement>;
  onShowNotes: () => void;
}> = ({
  tr,
  isVisible,
  notes,
  onNotesChange,
  onNotesKeyDown,
  notesTextareaRef,
  onShowNotes,
}) => {
  if (isVisible) {
    return (
      <div className="animate-slide-down">
        <div className="flex items-center space-x-2 mb-3">
          <MessageSquare className="text-gray-500 dark:text-gray-400" size={16} />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {tr('备注（可选）', 'Notes (optional)')}
          </label>
        </div>
        <textarea
          ref={notesTextareaRef}
          name="notes"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          onKeyDown={onNotesKeyDown}
          placeholder={tr('添加更多详细信息或感想…', 'Add more details or thoughts…')}
          rows={3}
          aria-label={tr('备注', 'Notes')}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {tr('按 Ctrl+Enter 完成，按 Esc 取消', 'Ctrl+Enter to complete, Esc to cancel')}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onShowNotes}
      aria-label={tr('添加备注', 'Add notes')}
      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
    >
      {tr('+ 添加备注', '+ Add notes')}
    </button>
  );
};

