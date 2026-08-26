import { Flame } from 'lucide-react';
import { useI18n } from '../../../i18n';
import { SettingSection } from '../../SettingSection';
import type { ChainEditorFormModel } from '../hooks/useChainEditorForm';
import { SacredSeatSettings } from './main-chain-settings/SacredSeatSettings';
import { TaskDurationSettings } from './main-chain-settings/TaskDurationSettings';

export function MainChainSettingsSection({
  form,
  isActiveSession = false,
}: {
  form: ChainEditorFormModel;
  isActiveSession?: boolean;
}) {
  const { language, tr } = useI18n();

  return (
    <SettingSection
      title={tr('主链设置', 'Main chain')}
      icon={<Flame className="text-primary-500" size={20} />}
      description={tr(
        '配置主要任务的执行参数',
        'Configure the main task execution settings',
      )}
    >
      <div className="grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white/90 shadow-sm dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800/80 md:grid-cols-2 md:divide-x md:divide-y-0">
        <SacredSeatSettings form={form} language={language} tr={tr} />
        <TaskDurationSettings
          form={form}
          tr={tr}
          isActiveSession={isActiveSession}
        />
      </div>
    </SettingSection>
  );
}
