import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { createUnitChain } from '../../test/factories/chainFactory';
import { ImportUnitsModal } from '../ImportUnitsModal';

function renderModal() {
  localStorage.setItem('language', 'en');

  render(
    <I18nProvider>
      <ImportUnitsModal
        availableUnits={[
          createUnitChain({ id: 'u1', name: 'Unit A', totalCompletions: 2 }),
          createUnitChain({ id: 'u2', name: 'Unit B', totalCompletions: 1 }),
        ]}
        groupId="group-1"
        onImport={vi.fn()}
        onClose={vi.fn()}
      />
    </I18nProvider>,
  );
}

describe('ImportUnitsModal accessibility', () => {
  it('exposes search input with an accessible label', () => {
    renderModal();
    expect(screen.getByLabelText('Search units')).toBeInTheDocument();
  });

  it('exposes unit selection button with a stable accessible label', () => {
    renderModal();
    expect(
      screen.getByRole('button', { name: 'Select unit: Unit A' }),
    ).toBeInTheDocument();
  });
});
