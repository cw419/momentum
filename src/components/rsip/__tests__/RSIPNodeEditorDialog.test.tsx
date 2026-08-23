import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RSIPNodeEditorDialog } from '../RSIPNodeEditorDialog';

function renderDialog(
  props: Partial<React.ComponentProps<typeof RSIPNodeEditorDialog>> = {},
) {
  const onClose = props.onClose ?? vi.fn();
  const onSave = props.onSave ?? vi.fn(async () => undefined);

  render(
    <RSIPNodeEditorDialog
      node={{
        id: 'policy-1',
        title: 'Original title',
        rule: 'Original rule',
        sortOrder: 1,
        createdAt: new Date('2026-08-23T00:00:00.000Z'),
      }}
      groups={[
        {
          id: 'group-1',
          title: 'Core policies',
          faultTolerance: 1,
          createdAt: new Date('2026-08-23T00:00:00.000Z'),
        },
      ]}
      language="en"
      onClose={onClose}
      onSave={onSave}
      tr={(_zh, en) => en}
      {...props}
    />,
  );

  return { onClose, onSave };
}

describe('RSIPNodeEditorDialog', () => {
  it('confirms and saves all editable policy fields after trimming text', async () => {
    const { onClose, onSave } = renderDialog();

    fireEvent.change(screen.getByLabelText('Policy title'), {
      target: { value: '  Updated title  ' },
    });
    fireEvent.change(screen.getByLabelText('Rule'), {
      target: { value: '  Updated rule  ' },
    });
    fireEvent.change(screen.getByLabelText('Node type'), {
      target: { value: 'habit' },
    });
    fireEvent.change(screen.getByLabelText('Policy group'), {
      target: { value: 'group-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByRole('dialog', { name: 'Confirm policy changes' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm changes' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        title: 'Updated title',
        rule: 'Updated rule',
        type: 'habit',
        groupId: 'group-1',
      });
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the editor open and reports a save failure', async () => {
    const onSave = vi.fn(async () => {
      throw new Error('write failed');
    });
    const { onClose } = renderDialog({ onSave });

    fireEvent.change(screen.getByLabelText('Rule'), {
      target: { value: 'Changed rule' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save. Please try again.',
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
