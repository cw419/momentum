import { useEffect, useState } from 'react';
import { DialogShell } from '../shared/DialogShell';
import type { CompletionHistory } from '../../types';
import { useI18n } from '../../i18n';

interface CompletionRecordEditorDialogProps {
  record: CompletionHistory | null;
  onClose: () => void;
  onSave: (
    record: CompletionHistory,
    updates: Pick<CompletionHistory, 'description' | 'notes'>,
  ) => Promise<void>;
}

export function CompletionRecordEditorDialog({
  record,
  onClose,
  onSave,
}: CompletionRecordEditorDialogProps) {
  const { tr } = useI18n();
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDescription(record?.description ?? '');
    setNotes(record?.notes ?? '');
    setError('');
  }, [record]);

  if (!record) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      await onSave(record, {
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch {
      setError(tr('保存失败，请重试。', 'Could not save. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogShell
      titleId="completion-record-editor-title"
      onClose={onClose}
      className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-800"
    >
      <h2
        id="completion-record-editor-title"
        className="font-chinese text-xl font-bold text-gray-900 dark:text-white"
      >
        {tr('编辑完成记录', 'Edit completion record')}
      </h2>
      <div className="mt-5 space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          {tr('任务描述', 'Task description')}
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          {tr('备注', 'Notes')}
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="focus-ring rounded-xl px-4 py-2 text-gray-700 dark:text-gray-200"
        >
          {tr('取消', 'Cancel')}
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="focus-ring rounded-xl bg-gray-950 px-5 py-2 font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950"
        >
          {isSaving ? tr('保存中…', 'Saving…') : tr('保存', 'Save')}
        </button>
      </div>
    </DialogShell>
  );
}
