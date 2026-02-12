import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '../../i18n';
import { AuxiliaryJudgment } from '../AuxiliaryJudgment';
import { createUnitChain } from '../../test/factories/chainFactory';

function clickButtonContaining(text: string) {
  const button = screen
    .getAllByRole('button')
    .find((candidate) => candidate.textContent?.includes(text));
  expect(button).toBeDefined();
  if (!button) throw new Error(`Button containing "${text}" not found`);
  fireEvent.click(button);
}

function renderJudgment(overrides: Parameters<typeof createUnitChain>[0] = {}) {
  localStorage.setItem('language', 'en');

  const onJudgmentFailure = vi.fn();
  const onJudgmentAllow = vi.fn();
  const onCancel = vi.fn();

  const chain = createUnitChain({
    name: 'Booking chain',
    auxiliarySignal: 'alarm',
    auxiliaryDuration: 15,
    auxiliaryCompletionTrigger: 'task_done',
    auxiliaryExceptions: ['Doctor appointment', 'Family emergency'],
    auxiliaryStreak: 6,
    ...overrides,
  });

  render(
    <I18nProvider>
      <AuxiliaryJudgment
        chain={chain}
        onJudgmentFailure={onJudgmentFailure}
        onJudgmentAllow={onJudgmentAllow}
        onCancel={onCancel}
      />
    </I18nProvider>,
  );

  return { onJudgmentFailure, onJudgmentAllow, onCancel };
}

describe('AuxiliaryJudgment', () => {
  it('associates labels with existing-rule select and reason textarea', () => {
    renderJudgment();

    fireEvent.click(screen.getByLabelText('Use an existing exception'));
    expect(
      screen.getByLabelText('Choose an applicable exception:'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Add a new exception'));
    expect(screen.getByLabelText('Describe what happened:')).toBeInTheDocument();
  });

  it('uses an existing exception rule when selected', () => {
    const { onJudgmentAllow } = renderJudgment();

    fireEvent.click(screen.getByLabelText('Use an existing exception'));
    clickButtonContaining('Allow');

    expect(onJudgmentAllow).toHaveBeenCalledWith('Doctor appointment');
  });

  it('adds a new exception reason when provided', () => {
    const { onJudgmentAllow } = renderJudgment();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Unexpected fire drill' },
    });

    clickButtonContaining('Allow');

    expect(onJudgmentAllow).toHaveBeenCalledWith('Unexpected fire drill');
  });

  it('allows duplicate reason without adding new exception branch', () => {
    const { onJudgmentAllow } = renderJudgment();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Doctor appointment' },
    });

    clickButtonContaining('Allow');

    expect(onJudgmentAllow).toHaveBeenCalledWith('Doctor appointment');
  });

  it('handles failure and cancel actions', () => {
    const { onJudgmentFailure, onCancel } = renderJudgment({
      auxiliaryExceptions: [],
    });

    clickButtonContaining('Mark as failed');
    clickButtonContaining('Cancel');

    expect(onJudgmentFailure).toHaveBeenCalledWith('User interrupted booking');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
