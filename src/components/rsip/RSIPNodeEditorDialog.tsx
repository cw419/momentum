import { useRef, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import type { RSIPNode, RSIPNodeGroup } from '../../types';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { DialogShell } from '../shared/DialogShell';
import { getRsipTypeLabel, rsipTypeEmojiMap } from './rsipUi';

export interface RSIPNodeDetails {
  title: string;
  rule: string;
  type: string;
  groupId?: string;
}

interface RSIPNodeEditorDialogProps {
  node: RSIPNode;
  groups: RSIPNodeGroup[];
  language: string;
  onClose: () => void;
  onSave: (details: RSIPNodeDetails) => Promise<void>;
  tr: (zh: string, en: string) => string;
}

export function RSIPNodeEditorDialog({
  node,
  groups,
  language,
  onClose,
  onSave,
  tr,
}: RSIPNodeEditorDialogProps) {
  const [title, setTitle] = useState(node.title);
  const [rule, setRule] = useState(node.rule);
  const [type, setType] = useState(node.type || 'policy');
  const [groupId, setGroupId] = useState(node.groupId || '');
  const [pendingDetails, setPendingDetails] = useState<RSIPNodeDetails>();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const titleInputRef = useRef<HTMLInputElement>(null);

  const canSave = title.trim().length > 0 && rule.trim().length > 0;
  const hasChanges =
    title.trim() !== node.title ||
    rule.trim() !== node.rule ||
    type !== (node.type || 'policy') ||
    groupId !== (node.groupId || '');

  const handleSave = () => {
    if (!canSave || isSaving) return;
    if (!hasChanges) return;

    setPendingDetails({
      title: title.trim(),
      rule: rule.trim(),
      type,
      groupId: groupId || undefined,
    });
  };

  const handleConfirmSave = async () => {
    const details = pendingDetails;
    if (!details || isSaving) return;

    setPendingDetails(undefined);
    setIsSaving(true);
    setSaveError(undefined);
    try {
      await onSave(details);
      onClose();
    } catch {
      setSaveError(
        tr('保存失败，请稍后重试。', 'Could not save. Please try again.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogShell
      titleId="rsip-node-editor-title"
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
            id="rsip-node-editor-title"
            className="font-chinese text-xl font-bold text-gray-900 dark:text-slate-100"
          >
            {tr('编辑国策', 'Edit policy')}
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
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
        className="space-y-5 p-6"
      >
        <label className="block">
          <span className="mb-2 block font-chinese text-sm font-medium text-gray-700 dark:text-slate-200">
            {tr('国策标题', 'Policy title')}
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
              {tr('节点类型', 'Node type')}
            </span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="focus-ring w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              {Object.entries(rsipTypeEmojiMap).map(([itemType, emoji]) => (
                <option key={itemType} value={itemType}>
                  {emoji} {getRsipTypeLabel(language, itemType)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block font-chinese text-sm font-medium text-gray-700 dark:text-slate-200">
              {tr('所属国策组', 'Policy group')}
            </span>
            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="focus-ring w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">{tr('不分组', 'No group')}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.emoji ? `${group.emoji} ` : ''}
                  {group.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block font-chinese text-sm font-medium text-gray-700 dark:text-slate-200">
            {tr('精准规则', 'Rule')}
          </span>
          <textarea
            value={rule}
            onChange={(event) => setRule(event.target.value)}
            rows={5}
            className="focus-ring w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>

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
            disabled={!canSave || !hasChanges || isSaving}
            className="focus-ring flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? tr('保存中…', 'Saving…') : tr('保存', 'Save')}
          </button>
        </div>
      </form>

      <ConfirmationDialog
        isOpen={pendingDetails !== undefined}
        title={tr('确认修改国策', 'Confirm policy changes')}
        message={tr(
          `将修改国策「${node.title}」的信息。确认保存吗？`,
          `Save the changes to "${node.title}"?`,
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
