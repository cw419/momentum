import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '../../i18n';

interface PetCreationDialogProps {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function PetCreationDialog({ onSubmit, onCancel }: PetCreationDialogProps) {
  const { tr } = useI18n();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldAutoFocus =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ESC 键关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  }, [onCancel]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!shouldAutoFocus) return;
    inputRef.current?.focus();
  }, [shouldAutoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(tr('请输入宠物名称', 'Please enter a pet name'));
      return;
    }

    if (trimmedName.length > 20) {
      setError(tr('名称不能超过20个字符', 'Name cannot exceed 20 characters'));
      return;
    }

    onSubmit(trimmedName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-creation-dialog-title"
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 animate-scale-in"
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🥒</div>
          <h2 id="pet-creation-dialog-title" className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {tr('领养你的宠物', 'Adopt Your Pet')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {tr('给你的新伙伴起个名字吧！', 'Give your new companion a name!')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              ref={inputRef}
              type="text"
              name="petName"
              autoComplete="off"
              value={name}
              onChange={e => {
                setName(e.target.value);
                setError('');
              }}
              placeholder={tr('宠物名称...', 'Pet name...')}
              aria-label={tr('宠物名称', 'Pet name')}
              aria-invalid={!!error}
              aria-describedby={error ? 'pet-name-error' : undefined}
              className={`
                w-full px-4 py-3 rounded-xl border-2
                ${error ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}
                bg-gray-50 dark:bg-gray-700
                text-gray-800 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:border-green-400 dark:focus:border-green-500
                transition-colors
              `}
              maxLength={20}
            />
            {error && <p id="pet-name-error" className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="
                flex-1 py-3 rounded-xl
                bg-gray-100 dark:bg-gray-700
                text-gray-600 dark:text-gray-300
                hover:bg-gray-200 dark:hover:bg-gray-600
                transition-colors
              "
            >
              {tr('稍后再说', 'Maybe Later')}
            </button>
            <button
              type="submit"
              className="
                flex-1 py-3 rounded-xl
                bg-gradient-to-r from-green-400 to-emerald-500
                text-white font-medium
                hover:from-green-500 hover:to-emerald-600
                transition-colors
              "
            >
              {tr('领养', 'Adopt')} 🎉
            </button>
          </div>
        </form>

        {/* Info */}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
          {tr(
            '完成任务可以喂养宠物，让它成长进化！',
            'Complete tasks to feed your pet and help it grow!'
          )}
        </p>
      </div>
    </div>
  );
}
