import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RSIPGroupEditorDialog } from '../RSIPGroupEditorDialog';

describe('RSIPGroupEditorDialog', () => {
  it('saves a renamed group without changing its identity', async () => {
    const onSave = vi.fn(async () => true);
    const onClose = vi.fn();
    render(
      <RSIPGroupEditorDialog
        group={{
          id: 'group-1',
          title: 'Original group',
          emoji: '🧭',
          faultTolerance: 1,
          createdAt: new Date('2026-09-02T00:00:00.000Z'),
        }}
        onClose={onClose}
        onSave={onSave}
        tr={(_zh, en) => en}
      />,
    );

    fireEvent.change(screen.getByLabelText('Group name'), {
      target: { value: '  Renamed group  ' },
    });
    fireEvent.change(screen.getByLabelText('Emoji'), {
      target: { value: '🧱' },
    });
    fireEvent.change(screen.getByLabelText('Fault tolerance'), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm changes' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        title: 'Renamed group',
        emoji: '🧱',
        faultTolerance: 3,
      });
    });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
