import React from 'react';
import type { DeletedChain } from '../../types';
import type { ConfirmDialogState } from '../useRecycleBinModal';
import { BulkActionsBar } from './components/BulkActionsBar';
import { ChainsList } from './components/ChainsList';
import { ConfirmDialog } from './components/ConfirmDialog';
import { EmptyState } from './components/EmptyState';
import { Header } from './components/Header';
import { LoadingState } from './components/LoadingState';

interface RecycleBinModalViewProps {
  isOpen: boolean;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
  deletedChains: DeletedChain[];
  selectedChains: Set<string>;
  isLoading: boolean;
  showConfirmDialog: ConfirmDialogState | null;
  formatDeletedTime: (deletedAt: Date) => string;
  onClose: () => void;
  onSelectChain: (chainId: string, selected: boolean) => void;
  onSelectAll: () => void;
  onSingleRestore: (chainId: string) => void;
  onSinglePermanentDelete: (chainId: string) => void;
  onBulkRestore: () => void;
  onBulkPermanentDelete: () => void;
  onConfirmAction: () => void;
  onCancelConfirm: () => void;
}

const RecycleBinModalViewComponent: React.FC<RecycleBinModalViewProps> = ({
  isOpen,
  language,
  tr,
  deletedChains,
  selectedChains,
  isLoading,
  showConfirmDialog,
  formatDeletedTime,
  onClose,
  onSelectChain,
  onSelectAll,
  onSingleRestore,
  onSinglePermanentDelete,
  onBulkRestore,
  onBulkPermanentDelete,
  onConfirmAction,
  onCancelConfirm,
}) => {
  if (!isOpen) return null;

  let content: React.ReactNode;
  if (isLoading) {
    content = <LoadingState tr={tr} />;
  } else if (deletedChains.length === 0) {
    content = <EmptyState tr={tr} />;
  } else {
    content = (
      <>
        <BulkActionsBar
          deletedChainsCount={deletedChains.length}
          selectedChainsCount={selectedChains.size}
          language={language}
          tr={tr}
          onSelectAll={onSelectAll}
          onBulkRestore={onBulkRestore}
          onBulkPermanentDelete={onBulkPermanentDelete}
        />
        <ChainsList
          deletedChains={deletedChains}
          selectedChains={selectedChains}
          formatDeletedTime={formatDeletedTime}
          onSelectChain={onSelectChain}
          onRestore={onSingleRestore}
          onPermanentDelete={onSinglePermanentDelete}
        />
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recycle-bin-modal-title"
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col"
      >
        <Header deletedChainsCount={deletedChains.length} language={language} tr={tr} onClose={onClose} />
        <div className="flex-1 overflow-hidden flex flex-col">{content}</div>
      </div>

      {showConfirmDialog && (
        <ConfirmDialog
          showConfirmDialog={showConfirmDialog}
          tr={tr}
          onConfirm={onConfirmAction}
          onCancel={onCancelConfirm}
        />
      )}
    </div>
  );
};

export const RecycleBinModalView = React.memo(RecycleBinModalViewComponent);
