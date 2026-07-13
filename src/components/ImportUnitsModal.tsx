import { useI18n } from '../i18n';
import type { ImportUnitsModalProps } from './ImportUnitsModal.types';
import { ImportUnitsModalView } from './import-units-modal/ImportUnitsModalView';
import { useImportUnitsController } from './import-units-modal/useImportUnitsController';

export function ImportUnitsModal(props: ImportUnitsModalProps) {
  const { language, tr } = useI18n();
  const controller = useImportUnitsController(props);
  const modeLabel =
    controller.importMode === 'copy'
      ? tr('复制模式', 'Copy')
      : tr('移动模式', 'Move');
  const selectionSummary =
    language === 'zh'
      ? `已选择 ${controller.selectedUnits.size} 个任务单元（${modeLabel}）`
      : `${controller.selectedUnits.size} selected (${modeLabel})`;

  return (
    <ImportUnitsModalView
      units={controller.importableUnits}
      selectedUnits={controller.selectedUnits}
      searchTerm={controller.searchTerm}
      importMode={controller.importMode}
      language={language}
      selectionSummary={selectionSummary}
      onSearchChange={controller.setSearchTerm}
      onModeChange={controller.setImportMode}
      onToggleUnit={controller.toggleUnit}
      onSubmit={controller.submit}
      onClose={props.onClose}
      tr={tr}
    />
  );
}
