/**
 * ChainDetailContainer - Container 组件
 * 负责状态管理和业务逻辑，将展示委托给 ChainDetailView
 */

import React, { useState } from 'react';
import { ChainDetailView } from './ChainDetailView';
import { CompletionRecordEditorDialog } from './chain-detail/CompletionRecordEditorDialog';
import { useChainDetail } from './useChainDetail';
import type { Chain, CompletionHistory } from '../types';

interface ChainDetailProps {
  chain: Chain;
  history: CompletionHistory[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateCompletionHistory: (
    id: string,
    updates: Pick<CompletionHistory, 'description' | 'notes'>,
  ) => Promise<void>;
}

export const ChainDetailContainer: React.FC<ChainDetailProps> = React.memo(
  ({ chain, history, onBack, onEdit, onDelete, onUpdateCompletionHistory }) => {
    const [editingRecord, setEditingRecord] = useState<CompletionHistory | null>(null);
    const {
      showDeleteConfirm,
      successRate,
      chainHistoryCount,
      language,
      locale,
      tr,
      formatFailureReason,
      handleDeleteClick,
      handleDeleteConfirm,
      handleDeleteCancel,
      visibleHistory,
      hasMoreHistory,
      handleLoadMore,
    } = useChainDetail({ chain, history, onDelete });

    return (
      <>
      <ChainDetailView
        chain={chain}
        recentHistory={visibleHistory}
        chainHistoryCount={chainHistoryCount}
        successRate={successRate}
        showDeleteConfirm={showDeleteConfirm}
        language={language}
        locale={locale}
        tr={tr}
        formatFailureReason={formatFailureReason}
        onBack={onBack}
        onEdit={onEdit}
        onDeleteClick={handleDeleteClick}
        onDeleteConfirm={handleDeleteConfirm}
        onDeleteCancel={handleDeleteCancel}
        onEditHistoryRecord={setEditingRecord}
        onLoadMoreHistory={handleLoadMore}
        hasMoreHistory={hasMoreHistory}
      />
      <CompletionRecordEditorDialog
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={async (record, updates) => {
          if (!record.id) throw new Error('Completion record is missing an ID');
          await onUpdateCompletionHistory(record.id, updates);
        }}
      />
      </>
    );
  },
);

ChainDetailContainer.displayName = 'ChainDetailContainer';
