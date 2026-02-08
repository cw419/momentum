import { useI18n } from '../../i18n';
import { BackButton } from '../BackButton';

interface ChainEditorHeaderProps {
  isEditing: boolean;
  onCancel: () => void;
}

export function ChainEditorHeader({
  isEditing,
  onCancel,
}: ChainEditorHeaderProps) {
  const { tr } = useI18n();

  return (
    <header className="mb-12 flex animate-fade-in items-center space-x-4">
      <BackButton
        onClick={onCancel}
        label={tr('返回', 'Back')}
        className="rounded-2xl p-3 text-gray-400 transition-colors hover:bg-white/50 hover:text-[#161615]"
      />
      <div>
        <h1 className="mb-2 font-chinese text-4xl font-bold text-[#161615] dark:text-slate-100 md:text-5xl">
          {isEditing
            ? tr('编辑链条', 'Edit chain')
            : tr('创建新链条', 'Create a new chain')}
        </h1>
        <p className="font-mono text-sm uppercase tracking-wider text-gray-500">
          {isEditing
            ? tr('编辑链条', 'EDIT CHAIN')
            : tr('创建链条', 'CREATE CHAIN')}
        </p>
      </div>
    </header>
  );
}
