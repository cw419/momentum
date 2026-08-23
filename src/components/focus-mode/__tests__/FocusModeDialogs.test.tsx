import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../i18n';
import { createLocalStorageMock } from '../../../test/factories/storageMock';
import { StorageContext } from '../../../storage/storageContextValue';
import { FocusModeDialogs } from '../FocusModeDialogs';

function Harness() {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        reopen
      </button>
      <FocusModeDialogs
        chainId="chain-1"
        chainName="Deep work"
        isDurationless={false}
        showRuleSelection={false}
        pendingActionType={null}
        sessionContext={{} as any}
        onRuleSelected={vi.fn()}
        onCreateNewRule={vi.fn()}
        onRuleSelectionCancel={vi.fn()}
        showCompletionDialog={isOpen}
        onDirectComplete={vi.fn()}
        onCompletionCancel={() => setIsOpen(false)}
        showInterruptDialog={false}
        onCancelInterrupt={vi.fn()}
        onConfirmInterrupt={vi.fn()}
      />
    </>
  );
}

describe('FocusModeDialogs', () => {
  it('retains the completion draft after Escape and reopening', () => {
    localStorage.setItem('language', 'en');
    render(
      <StorageContext.Provider value={createLocalStorageMock()}>
        <I18nProvider>
          <Harness />
        </I18nProvider>
      </StorageContext.Provider>,
    );

    const input = screen.getByRole('textbox', { name: 'Task description' });
    fireEvent.change(input, { target: { value: 'Draft task' } });
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'reopen' }));
    expect(screen.getByRole('textbox', { name: 'Task description' })).toHaveValue(
      'Draft task',
    );
  });
});
