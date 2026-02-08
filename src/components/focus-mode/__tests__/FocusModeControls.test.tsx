import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '../../../i18n';
import { FocusModeControls } from '../FocusModeControls';
import type { ActiveSession } from '../../../types';
import { createUnitChain } from '../../../test/factories/chainFactory';

function renderControls(options: {
  session?: Partial<ActiveSession>;
  isDurationless?: boolean;
  hasReachedMinimum?: boolean;
  autoResumeAt?: number | null;
}) {
  localStorage.setItem('language', 'en');

  const session: ActiveSession = {
    chainId: 'chain-1',
    startedAt: new Date('2026-02-07T00:00:00.000Z'),
    duration: 30,
    isPaused: false,
    totalPausedTime: 0,
    ...options.session,
  };

  const callbacks = {
    onPauseClick: vi.fn(),
    onEarlyCompleteClick: vi.fn(),
    onResumeNow: vi.fn(),
    onCancelAutoResume: vi.fn(),
  };

  render(
    <I18nProvider>
      <FocusModeControls
        session={session}
        chain={createUnitChain({ minimumDuration: 0 })}
        isDurationless={options.isDurationless ?? true}
        hasReachedMinimum={options.hasReachedMinimum ?? false}
        autoResumeAt={options.autoResumeAt ?? null}
        resumeCountdown={75}
        elapsedPauseTime={130}
        {...callbacks}
      />
    </I18nProvider>,
  );

  return callbacks;
}

describe('FocusModeControls', () => {
  it('shows pause + complete for durationless chains without minimum duration', () => {
    const callbacks = renderControls({
      isDurationless: true,
      hasReachedMinimum: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));

    expect(callbacks.onPauseClick).toHaveBeenCalledTimes(1);
    expect(callbacks.onEarlyCompleteClick).toHaveBeenCalledTimes(1);
  });

  it('shows complete early when minimum duration not reached', () => {
    localStorage.setItem('language', 'en');
    const session: ActiveSession = {
      chainId: 'chain-1',
      startedAt: new Date('2026-02-07T00:00:00.000Z'),
      duration: 30,
      isPaused: false,
      totalPausedTime: 0,
    };
    const onEarlyCompleteClick = vi.fn();

    render(
      <I18nProvider>
        <FocusModeControls
          session={session}
          chain={createUnitChain({ minimumDuration: 10 })}
          isDurationless
          hasReachedMinimum={false}
          onPauseClick={vi.fn()}
          onEarlyCompleteClick={onEarlyCompleteClick}
          autoResumeAt={null}
          resumeCountdown={0}
          elapsedPauseTime={0}
          onResumeNow={vi.fn()}
          onCancelAutoResume={vi.fn()}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Complete early' }));
    expect(onEarlyCompleteClick).toHaveBeenCalledTimes(1);
  });

  it('shows paused controls with auto-resume actions', () => {
    const callbacks = renderControls({
      session: { isPaused: true },
      autoResumeAt: Date.now() + 75_000,
    });

    expect(
      screen.getByText('Paused. Auto-resume in 1m 15s'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel auto-resume' }));

    expect(callbacks.onResumeNow).toHaveBeenCalledTimes(1);
    expect(callbacks.onCancelAutoResume).toHaveBeenCalledTimes(1);
  });

  it('shows elapsed paused time when auto-resume is disabled', () => {
    renderControls({
      session: { isPaused: true },
      autoResumeAt: null,
    });

    expect(screen.getByText('Paused for 2m 10s')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancel auto-resume' }),
    ).not.toBeInTheDocument();
  });

  it('shows non-durationless button labels', () => {
    const callbacks = renderControls({ isDurationless: false });

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete early' }));

    expect(callbacks.onPauseClick).toHaveBeenCalledTimes(1);
    expect(callbacks.onEarlyCompleteClick).toHaveBeenCalledTimes(1);
  });
});
