import { useRef, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import type { RSIPNodeGroup } from '../../types';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { DialogShell } from '../shared/DialogShell';

export interface RSIPGroupDetails {
  title: string;
  emoji?: string;
  faultTolerance: number;
}

interface RSIPGroupEditorDialogProps {
  group: RSIPNodeGroup;
  onClose: () => void;
  onSave: (details: RSIPGroupDetails) => Promise<boolean | void>;
  tr: (zh: string, en: string) => string;
}

export function RSIPGroupEditorDialog({
  group,
  onClose,
  onSave,
  tr,
}: RSIPGroupEditorDialogProps) {
  const [title, setTitle] = useState(group.title);
  const [emoji, setEmoji] = useState(group.emoji ?? '');
  const [faultTolerance, setFaultTolerance] = useState(group.faultTolerance);
  const [pendingDetails, setPendingDetails] = useState<RSIPGroupDetails>();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const titleInputRef = useRef<HTMLInputElement>(null);

  const normalizedTolerance = Math.max(0, Math.floor(faultTolerance || 0));
  const details: RSIPGroupDetails = {
    title: title.trim(),
    emoji: emoji.trim() || undefined,
    faultTolerance: normalizedTolerance,
  };
  const hasChanges =
    details.title !== group.title ||
    details.emoji !== group.emoji ||
    details.faultTolerance !== group.faultTolerance;

  const handleConfirmSave = async () => {
    if (!pendingDetails || isSaving) return;
    setIsSaving(true);
    setSaveError(undefined);
    try {
      const didSave = await onSave(pendingDetails);
      if (didSave !== false) onClose();
    } catch {
      setSaveError(
        tr('保存失败，请稍后重试。', 'Could not save. Please try again.'),
      );
    } finally {
      setIsSaving(false);
      setPendingDetails(undefined);
    }
  };

  return (
    <DialogShell
      titleId="rsip-group-editor-title"
      onClose={onClose}
      initialFocusRef={titleInputRef}
      className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
    >
      <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-slate-600">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/20">
            <Pencil
              size={20}
              className="text-emerald-700 dark:text-emerald-300"
            />
          </div>
          <h2
            id="rsip-group-editor-title"
            className="font-chinese text-xl font-bold text-gray-900 dark:text-slate-100"
          >
            {tr('编辑国策组', 'Edit policy group')}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={tr('关闭', 'Close')}
          className="focus-ring flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          <X size={22} className="text-gray-600 dark:text-slate-300" />
        </button>
      </div>

      <form
        className="space-y-5 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (details.title && hasChanges && !isSaving)
            setPendingDetails(details);
        }}
      >
        <label className="block">
          <span className="mb-2 block font-chinese text-sm font-medium text-gray-700 dark:text-slate-200">
            {tr('组名称', 'Group name')}
          </span>
          <input
            ref={titleInputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="focus-ring w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block font-chinese text-sm font-medium text-gray-700 dark:text-slate-200">
              Emoji
            </span>
            <input
              value={emoji}
              onChange={(event) => setEmoji(event.target.value)}
              className="focus-ring w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-2 block font-chinese text-sm font-medium text-gray-700 dark:text-slate-200">
              {tr('容错值', 'Fault tolerance')}
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={faultTolerance}
              onChange={(event) =>
                setFaultTolerance(Number(event.target.value))
              }
              className="focus-ring w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
        {saveError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-300">
            {saveError}
          </p>
        )}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="focus-ring flex-1 rounded-xl bg-gray-100 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            {tr('取消', 'Cancel')}
          </button>
          <button
            type="submit"
            disabled={!details.title || !hasChanges || isSaving}
            className="focus-ring flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? tr('保存中…', 'Saving…') : tr('保存', 'Save')}
          </button>
        </div>
      </form>
      <ConfirmationDialog
        isOpen={pendingDetails !== undefined}
        title={tr('确认修改国策组', 'Confirm group changes')}
        message={tr(
          `将修改国策组「${group.title}」。确认保存吗？`,
          `Save the changes to group "${group.title}"?`,
        )}
        confirmText={tr('确认修改', 'Confirm changes')}
        cancelText={tr('继续编辑', 'Keep editing')}
        confirmButtonClass="bg-emerald-600 hover:bg-emerald-700"
        onConfirm={() => void handleConfirmSave()}
        onCancel={() => setPendingDetails(undefined)}
      />
    </DialogShell>
  );
}
