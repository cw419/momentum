import React from 'react';
import {
  ChainDetailHeader,
  ChainDetailStats,
  ChainDetailExceptions,
  ChainDetailDescription,
  ChainDetailHistory,
  DeleteConfirmModal,
} from './chain-detail';
import type { ChainDetailViewProps } from './chain-detail';

export type { ChainDetailViewProps };

const ChainDetailViewComponent: React.FC<ChainDetailViewProps> = ({
  chain,
  recentHistory,
  chainHistoryCount,
  successRate,
  showDeleteConfirm,
  language,
  locale,
  tr,
  formatFailureReason,
  onBack,
  onEdit,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}) => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <ChainDetailHeader
          chainName={chain.name}
          tr={tr}
          onBack={onBack}
          onEdit={onEdit}
          onDeleteClick={onDeleteClick}
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-1 space-y-6">
            <ChainDetailStats
              chain={chain}
              successRate={successRate}
              language={language}
              tr={tr}
            />

            <ChainDetailExceptions chain={chain} tr={tr} />
          </div>

          <div className="xl:col-span-2 space-y-6">
            <ChainDetailDescription description={chain.description} tr={tr} />

            <ChainDetailHistory
              recentHistory={recentHistory}
              locale={locale}
              language={language}
              tr={tr}
              formatFailureReason={formatFailureReason}
            />
          </div>
        </div>

        {showDeleteConfirm && (
          <DeleteConfirmModal
            chain={chain}
            chainHistoryCount={chainHistoryCount}
            successRate={successRate}
            language={language}
            tr={tr}
            onConfirm={onDeleteConfirm}
            onCancel={onDeleteCancel}
          />
        )}
      </div>
    </div>
  );
};

export const ChainDetailView = React.memo(ChainDetailViewComponent);
