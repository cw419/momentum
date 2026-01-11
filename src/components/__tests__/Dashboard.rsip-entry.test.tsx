import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Dashboard } from '../Dashboard';
import { I18nProvider } from '../../i18n';
import { StorageProvider } from '../../storage/StorageContext';

describe('Dashboard RSIP entry', () => {
  beforeEach(() => {
    localStorage.setItem('language', 'en');
  });

  it('shows RSIP entry even when all chains are deleted', () => {
    const onOpenRSIP = vi.fn();

    const mockStorage = {
      kind: 'local',
      getDeletedChains: vi.fn().mockResolvedValue([]),
    };

    render(
      <I18nProvider>
        <StorageProvider storage={mockStorage as any}>
          <Dashboard
            chains={[]}
            scheduledSessions={[]}
            onCreateChain={vi.fn()}
            onCreateTaskGroup={vi.fn()}
            onOpenRSIP={onOpenRSIP}
            onStartChain={vi.fn()}
            onScheduleChain={vi.fn()}
            onViewChainDetail={vi.fn()}
            onCancelScheduledSession={vi.fn()}
            onCompleteBooking={vi.fn()}
            onDeleteChain={vi.fn()}
            onImportChains={vi.fn().mockResolvedValue(undefined)}
            onRestoreChains={vi.fn()}
            onPermanentDeleteChains={vi.fn()}
          />
        </StorageProvider>
      </I18nProvider>
    );

    const rsipButton = screen.getByRole('button', { name: /RSIP Tree/i });
    expect(rsipButton).toBeInTheDocument();

    fireEvent.click(rsipButton);
    expect(onOpenRSIP).toHaveBeenCalledTimes(1);
  });
});

