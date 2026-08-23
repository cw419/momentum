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
  onEditHistoryRecord,
  onLoadMoreHistory,
  hasMoreHistory,
}) => {
  return (
    <div className="bg-background min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <ChainDetailHeader
          chainName={chain.name}
          tr={tr}
          onBack={onBack}
          onEdit={onEdit}
          onDeleteClick={onDeleteClick}
        />

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-1">
            <ChainDetailStats
              chain={chain}
              successRate={successRate}
              language={language}
              tr={tr}
            />

            <ChainDetailExceptions chain={chain} tr={tr} />
          </div>

          <div className="space-y-6 xl:col-span-2">
            <ChainDetailDescription description={chain.description} tr={tr} />

            <ChainDetailHistory
              recentHistory={recentHistory}
              locale={locale}
              language={language}
              tr={tr}
              formatFailureReason={formatFailureReason}
              onEditRecord={onEditHistoryRecord}
              onLoadMore={onLoadMoreHistory}
              hasMore={hasMoreHistory}
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
