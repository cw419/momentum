import { X } from 'lucide-react';

interface AccountModalHeaderProps {
  title: string;
  closeLabel: string;
  onClose: () => void;
}

export function AccountModalHeader({ title, closeLabel, onClose }: AccountModalHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
      <h2 id="account-modal-title" className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors focus-ring rounded"
      >
        <X size={24} />
      </button>
    </div>
  );
}
