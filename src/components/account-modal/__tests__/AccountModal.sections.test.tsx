import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '../../../i18n';
import { AccountModal } from '../../AccountModal';

vi.mock('../../../storage/useStorage', () => ({
  useStorage: () => ({ kind: 'local' }),
}));

vi.mock('../../../storage/useStorageMode', () => ({
  useStorageMode: () => ({
    mode: 'local' as const,
    canUseSupabase: false,
    isChoicePending: false,
    setMode: vi.fn(),
    dismissFirstLaunchHint: vi.fn(),
  }),
}));

const renderWithI18n = (ui: React.ReactElement) => {
  return render(ui, { wrapper: I18nProvider });
};

describe('AccountModal sections', () => {
  beforeEach(() => {
    localStorage.setItem('language', 'en');
  });

  it('renders header + language section + local storage notice', () => {
    renderWithI18n(<AccountModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByText(/Using local storage/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithI18n(<AccountModal isOpen={false} onClose={() => {}} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
