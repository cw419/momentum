import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { createUnitChain } from '../../test/factories/chainFactory';
import { ImportUnitsModal } from '../ImportUnitsModal';

const units = [
  createUnitChain({ id: 'u1', name: 'Unit A', totalCompletions: 2 }),
  createUnitChain({ id: 'u2', name: 'Unit B', totalCompletions: 1 }),
];

function renderModal(availableUnits = units) {
  localStorage.setItem('language', 'en');
  const onImport = vi.fn();
  const onClose = vi.fn();

  const renderResult = render(
    <I18nProvider>
      <ImportUnitsModal
        availableUnits={availableUnits}
        groupId="group-1"
        onImport={onImport}
        onClose={onClose}
      />
    </I18nProvider>,
  );
  return { onImport, onClose, unmount: renderResult.unmount };
}

describe('ImportUnitsModal', () => {
  it('searches units and renders an empty result state', async () => {
    const user = userEvent.setup();
    renderModal();
    const search = screen.getByRole('searchbox', { name: 'Search units' });

    expect(search).toHaveFocus();
    await user.type(search, 'Unit B');
    expect(
      screen.queryByRole('button', { name: 'Select unit: Unit A' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Select unit: Unit B' }),
    ).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'missing');
    expect(screen.getByText('No importable units found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search')).toBeInTheDocument();
  });

  it('exposes pressed selection state and submits copy mode', async () => {
    const user = userEvent.setup();
    const { onImport, onClose } = renderModal();
    const option = screen.getByRole('button', { name: 'Select unit: Unit A' });

    expect(option).toHaveAttribute('aria-pressed', 'false');
    await user.click(option);
    expect(option).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /^Import/ }));

    expect(onImport).toHaveBeenCalledWith(['u1'], 'group-1', 'copy');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submits move mode and keeps import disabled without a selection', async () => {
    const user = userEvent.setup();
    const { onImport } = renderModal();
    const submit = screen.getByRole('button', { name: /^Import/ });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: 'Move' }));
    await user.click(
      screen.getByRole('button', { name: 'Select unit: Unit B' }),
    );
    await user.click(submit);

    expect(onImport).toHaveBeenCalledWith(['u2'], 'group-1', 'move');
  });

  it('closes with Escape and restores the previously focused element', async () => {
    const user = userEvent.setup();
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { onClose, unmount } = renderModal();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    // The parent owns unmounting after onClose; emulate that lifecycle here.
    unmount();
    await waitFor(() => expect(opener).toHaveFocus());
    opener.remove();
  });
});
