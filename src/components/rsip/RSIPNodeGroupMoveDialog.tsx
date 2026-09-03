import { AlertTriangle } from 'lucide-react';
import { DialogShell } from '../shared/DialogShell';

interface RSIPNodeGroupMoveDialogProps {
  nodeTitle: string;
  parentTitle: string;
  sourceGroupTitle?: string;
  targetGroupTitle?: string;
  canCreateGroupRelation: boolean;
  onCancel: () => void;
  onMoveOnly: () => void;
  onMoveAndLinkGroups: () => void;
  tr: (zh: string, en: string) => string;
}

export function RSIPNodeGroupMoveDialog({
  nodeTitle,
  parentTitle,
  sourceGroupTitle,
  targetGroupTitle,
  canCreateGroupRelation,
  onCancel,
  onMoveOnly,
  onMoveAndLinkGroups,
  tr,
}: RSIPNodeGroupMoveDialogProps) {
  return (
    <DialogShell
      titleId="rsip-node-group-move-title"
      onClose={onCancel}
      role="alertdialog"
      className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
    >
      <div className="flex items-center gap-3 border-b border-gray-200 p-6 dark:border-slate-600">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-900/20">
          <AlertTriangle
            size={20}
            className="text-orange-600 dark:text-orange-400"
          />
        </div>
        <h2
          id="rsip-node-group-move-title"
          className="font-chinese text-xl font-bold text-gray-900 dark:text-slate-100"
        >
          {tr('确认迁移国策分支', 'Confirm policy branch migration')}
        </h2>
      </div>
      <div className="space-y-3 p-6 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
        <p>
          {tr(
            `「${nodeTitle}」与父节点「${parentTitle}」不能属于不同国策组。继续后，该节点及全部子节点会迁入「${targetGroupTitle ?? '未分组'}」，并解除当前父子关系。`,
            `"${nodeTitle}" cannot remain in a different policy group from parent "${parentTitle}". Continuing moves this node and all descendants to "${targetGroupTitle ?? 'No group'}" and detaches the current parent relationship.`,
          )}
        </p>
        {canCreateGroupRelation && (
          <p>
            {tr(
              `你也可以建立「${sourceGroupTitle} → ${targetGroupTitle}」的组从属关系。`,
              `You can also create the group relationship "${sourceGroupTitle} → ${targetGroupTitle}".`,
            )}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-3 p-6 pt-0">
        <button
          type="button"
          onClick={onCancel}
          className="focus-ring flex-1 rounded-xl bg-gray-100 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          {tr('取消', 'Cancel')}
        </button>
        <button
          type="button"
          onClick={onMoveOnly}
          className="focus-ring flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition-colors hover:bg-emerald-700"
        >
          {tr('仅迁移节点', 'Move nodes only')}
        </button>
        {canCreateGroupRelation && (
          <button
            type="button"
            onClick={onMoveAndLinkGroups}
            className="focus-ring flex-1 rounded-xl bg-teal-700 px-4 py-3 font-medium text-white transition-colors hover:bg-teal-800"
          >
            {tr('迁移并建立组关系', 'Move and link groups')}
          </button>
        )}
      </div>
    </DialogShell>
  );
}
