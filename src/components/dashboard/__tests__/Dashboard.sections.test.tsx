import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { I18nProvider } from '../../../i18n';
import { StorageProvider } from '../../../storage/StorageContext';
import { Dashboard } from '../../Dashboard';

describe('Dashboard sections', () => {
  beforeEach(() => {
    localStorage.setItem('language', 'en');
  });

  it('renders stable section test ids', () => {
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
            onOpenRSIP={vi.fn()}
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
      </I18nProvider>,
    );

    expect(screen.getByTestId('dashboard-topbar')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-hero')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-empty-state')).toBeInTheDocument();
  });
});
