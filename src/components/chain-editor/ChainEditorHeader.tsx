import { ArrowLeft } from 'lucide-react';
import { useI18n } from '../../i18n';

interface ChainEditorHeaderProps {
  isEditing: boolean;
  onCancel: () => void;
}

export function ChainEditorHeader({ isEditing, onCancel }: ChainEditorHeaderProps) {
  const { tr } = useI18n();

  return (
    <header className="flex items-center space-x-4 mb-12 animate-fade-in">
      <button
        onClick={onCancel}
        className="p-3 text-gray-400 hover:text-[#161615] transition-colors rounded-2xl hover:bg-white/50"
      >
        <ArrowLeft size={24} />
      </button>
      <div>
        <h1 className="text-4xl md:text-5xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-2">
          {isEditing ? tr('编辑链条', 'Edit chain') : tr('创建新链条', 'Create a new chain')}
        </h1>
        <p className="text-sm font-mono text-gray-500 tracking-wider uppercase">
          {isEditing ? tr('编辑链条', 'EDIT CHAIN') : tr('创建链条', 'CREATE CHAIN')}
        </p>
      </div>
    </header>
  );
}

