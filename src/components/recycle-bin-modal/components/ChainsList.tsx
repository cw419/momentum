import React from 'react';
import type { DeletedChain } from '../../../types';
import { DeletedChainCard } from '../../DeletedChainCard';

interface ChainsListProps {
  deletedChains: DeletedChain[];
  selectedChains: Set<string>;
  formatDeletedTime: (deletedAt: Date) => string;
  onSelectChain: (chainId: string, selected: boolean) => void;
  onRestore: (chainId: string) => void;
  onPermanentDelete: (chainId: string) => void;
}

export const ChainsList: React.FC<ChainsListProps> = ({
  deletedChains,
  selectedChains,
  formatDeletedTime,
  onSelectChain,
  onRestore,
  onPermanentDelete,
}) => (
  <div
    className="flex-1 overflow-y-auto p-8"
    style={{ overscrollBehavior: 'contain' }}
  >
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {deletedChains.map((chain) => (
        <DeletedChainCard
          key={chain.id}
          chain={chain}
          isSelected={selectedChains.has(chain.id)}
          onSelect={onSelectChain}
          onRestore={onRestore}
          onPermanentDelete={onPermanentDelete}
          deletedTimeText={formatDeletedTime(chain.deletedAt)}
        />
      ))}
    </div>
  </div>
);
