import { describe, expect, it, vi } from 'vitest';
import type { RecoveryAction } from '../../ErrorRecoveryManager';
import { InteractiveFeedback } from '../InteractiveFeedback';

function createRecoveryAction(id: string, label: string): RecoveryAction {
  return {
    id,
    label,
    description: `${label} description`,
    type: 'primary',
    handler: vi.fn(async () => ({ success: true, message: `${label} done` })),
  };
}

describe('InteractiveFeedback', () => {
  it('showRecoveryOptions resolves selected option and removes message', async () => {
    const addedMessages: any[] = [];
    const store = {
      generateMessageId: vi.fn(() => 'msg-1'),
      addMessage: vi.fn((message) => addedMessages.push(message)),
      removeMessage: vi.fn(),
    };
    const presenter = {
      showInfo: vi.fn(),
    };

    const feedback = new InteractiveFeedback(store as any, presenter as any);
    const options = [
      createRecoveryAction('retry', 'Retry'),
      createRecoveryAction('reset', 'Reset'),
    ];

    const pending = feedback.showRecoveryOptions(options);

    const actions = addedMessages[0]?.actions ?? [];
    await actions[0].handler();
    const selected = await pending;

    expect(selected?.id).toBe('retry');
    expect(store.removeMessage).toHaveBeenCalledWith('msg-1');
  });

  it('showConfirmation resolves true for confirm and false for cancel', async () => {
    const addedMessages: any[] = [];
    const store = {
      generateMessageId: vi
        .fn()
        .mockReturnValueOnce('confirm-1')
        .mockReturnValueOnce('confirm-2'),
      addMessage: vi.fn((message) => addedMessages.push(message)),
      removeMessage: vi.fn(),
    };
    const feedback = new InteractiveFeedback(
      store as any,
      { showInfo: vi.fn() } as any,
    );

    const firstPending = feedback.showConfirmation(
      'Confirm title',
      'Confirm message',
    );
    await addedMessages[0].actions[0].handler();
    const firstResult = await firstPending;

    const secondPending = feedback.showConfirmation(
      'Confirm title',
      'Confirm message',
    );
    await addedMessages[1].actions[1].handler();
    const secondResult = await secondPending;

    expect(firstResult).toBe(true);
    expect(secondResult).toBe(false);
    expect(store.removeMessage).toHaveBeenCalledWith('confirm-1');
    expect(store.removeMessage).toHaveBeenCalledWith('confirm-2');
  });

  it('showBatchOperationFeedback creates warning action for error details', () => {
    const addedMessages: any[] = [];
    const store = {
      generateMessageId: vi.fn(() => 'batch-1'),
      addMessage: vi.fn((message) => addedMessages.push(message)),
      removeMessage: vi.fn(),
    };
    const presenter = {
      showInfo: vi.fn(),
    };
    const feedback = new InteractiveFeedback(store as any, presenter as any);

    const id = feedback.showBatchOperationFeedback('Import', 5, 3, 2, [
      'error A',
      'error B',
    ]);

    expect(id).toBe('batch-1');
    expect(addedMessages[0]?.type).toBe('warning');
    expect(addedMessages[0]?.actions?.length).toBe(1);

    addedMessages[0].actions[0].handler();
    expect(presenter.showInfo).toHaveBeenCalledWith(
      'Error details',
      'error A\nerror B',
      false,
    );
  });
});
