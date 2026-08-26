import { ResponsiveContainer } from '../ResponsiveContainer';
import { RSIPTaskLinkPanel } from '../rsip/RSIPTaskLinkPanel';
import type { Chain, RSIPNode, RSIPTaskLink } from '../../types';
import type { ChainEditorFormModel } from './hooks/useChainEditorForm';
import { ChainEditorActions } from './ChainEditorActions';
import { ChainEditorHeader } from './ChainEditorHeader';
import { AuxiliaryChainSettingsSection } from './sections/AuxiliaryChainSettingsSection';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { MainChainSettingsSection } from './sections/MainChainSettingsSection';
import { TaskDescriptionSection } from './sections/TaskDescriptionSection';
import { useI18n } from '../../i18n';
import type { CSSProperties } from 'react';

type EditorSurfaceStyle = CSSProperties & { '--keyboard-height': string };

interface ChainEditorViewProps {
  chain?: Chain;
  isEditing: boolean;
  isActiveSession: boolean;
  onCancel: () => void;
  form: ChainEditorFormModel;
  keyboardHeight: number;
  rsipNodes?: RSIPNode[];
  rsipTaskLinks?: RSIPTaskLink[];
  onUpsertRSIPTaskLinks?: (links: RSIPTaskLink[]) => void | Promise<unknown>;
}

export function ChainEditorView({
  chain,
  isEditing,
  isActiveSession,
  onCancel,
  form,
  keyboardHeight,
  rsipNodes,
  rsipTaskLinks,
  onUpsertRSIPTaskLinks,
}: ChainEditorViewProps) {
  const { tr } = useI18n();
  const canEditRsipLinks = Boolean(
    chain?.id && rsipNodes && rsipTaskLinks && onUpsertRSIPTaskLinks,
  );
  const editorStyle: EditorSurfaceStyle = {
    '--keyboard-height': `${keyboardHeight}px`,
  };

  return (
    <div
      className="editor-surface bg-background performance-layer overflow-x-clip"
      style={editorStyle}
      data-scrollable="true"
    >
      <ResponsiveContainer
        maxWidth="4xl"
        className="editor-scroll-region py-4 md:py-6"
        data-scrollable="true"
      >
        <ChainEditorHeader isEditing={isEditing} onCancel={onCancel} />

        <form
          onSubmit={form.handleSubmit}
          className="performance-layer animate-slide-up space-y-8"
        >
          {isActiveSession && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 font-chinese text-sm text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/30 dark:text-amber-200">
              {tr(
                '该任务正在计时。任务类型和计时设置将在完成或中断后才能修改；其他内容仍可编辑。',
                'This task is currently timed. Its type and timer settings can be changed after it is completed or interrupted; other details remain editable.',
              )}
            </div>
          )}
          <BasicInfoSection form={form} isActiveSession={isActiveSession} />
          <MainChainSettingsSection
            form={form}
            isActiveSession={isActiveSession}
          />
          <AuxiliaryChainSettingsSection form={form} />
          <TaskDescriptionSection form={form} />
          <section className="space-y-3" data-testid="chain-editor-rsip-links">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              {tr('RSIP 流程联动', 'RSIP Integration')}
            </h2>
            {canEditRsipLinks ? (
              <RSIPTaskLinkPanel
                links={rsipTaskLinks ?? []}
                nodes={rsipNodes ?? []}
                chains={chain ? [chain] : []}
                fixedChainId={chain?.id}
                title={tr('任务侧 RSIP 联动', 'Task-side RSIP links')}
                description={tr(
                  '可在编辑器中直接为该任务配置联动。冲突采用最后写入生效（LWW）。',
                  'Configure links for this task directly in the editor. Conflicts use last-write-wins.',
                )}
                onUpsertLinks={onUpsertRSIPTaskLinks!}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                {tr(
                  '请先保存任务，再在这里配置 RSIP 联动。',
                  'Save this task first, then configure RSIP links here.',
                )}
              </div>
            )}
          </section>
          <ChainEditorActions
            isEditing={isEditing}
            onCancel={onCancel}
            form={form}
          />
        </form>
      </ResponsiveContainer>
    </div>
  );
}
