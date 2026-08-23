import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChainDetailHistory } from '../ChainDetailHistory';
import type { CompletionHistory } from '../../../types';

const tr = (_zh: string, en: string) => en;

function record(index: number): CompletionHistory {
  return {
    id: `record-${index}`,
    chainId: 'chain-1',
    completedAt: new Date(`2026-01-${String((index % 28) + 1).padStart(2, '0')}T12:00:00.000Z`),
    duration: 25,
    wasSuccessful: true,
    description: `Task ${index}`,
  };
}

describe('ChainDetailHistory', () => {
  it('lets successful records be edited and loads more history', () => {
    const onEditRecord = vi.fn();
    const onLoadMore = vi.fn();
    render(
      <ChainDetailHistory
        recentHistory={[record(1), record(2)]}
        locale="en-US"
        language="en"
        tr={tr}
        formatFailureReason={(reason) => reason}
        onEditRecord={onEditRecord}
        onLoadMore={onLoadMore}
        hasMore
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit record' })[0]);
    expect(onEditRecord).toHaveBeenCalledWith(record(1));

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
