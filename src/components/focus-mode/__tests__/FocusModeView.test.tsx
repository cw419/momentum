import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../i18n';
import { createUnitChain } from '../../../test/factories';
import type { ActiveSession } from '../../../types';
import { FocusModeView } from '../FocusModeView';

vi.mock('../FocusModeControls', () => ({
  FocusModeControls: ({ onPauseClick }: { onPauseClick: () => void }) => (
    <button type="button" onClick={onPauseClick}>
      mock-controls
    </button>
  ),
}));

vi.mock('../InterruptConfirmDialog', () => ({
  InterruptConfirmDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>mock-interrupt-dialog</div> : null,
}));

vi.mock('../../RuleSelectionDialog', () => ({
  RuleSelectionDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>mock-rule-selection</div> : null,
}));

vi.mock('../../TaskCompletionDialog', () => ({
  TaskCompletionDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>mock-completion-dialog</div> : null,
}));

vi.mock('../../UserFeedbackDisplay', () => ({
  UserFeedbackDisplay: () => <div>mock-feedback</div>,
}));

function createSession(overrides: Partial<ActiveSession> = {}): ActiveSession {
  return {
    chainId: overrides.chainId ?? 'chain-1',
    startedAt: overrides.startedAt ?? new Date('2026-02-06T09:00:00.000Z'),
    duration: overrides.duration ?? 30,
    isPaused: overrides.isPaused ?? false,
    totalPausedTime: overrides.totalPausedTime ?? 0,
    ...overrides,
  };
}

function createProps(overrides: Partial<ComponentProps<typeof FocusModeView>> = {}) {
  const chain = createUnitChain({
    id: 'chain-1',
    name: 'Deep Work',
    trigger: 'Start',
    duration: 30,
    currentStreak: 4,
  });

  return {
    session: createSession({ chainId: chain.id }),
    chain,
    isDurationless: false,
    timeRemaining: 900,
    elapsedSeconds: 300,
    progress: 33,
    lastCompletionTime: null,
    hasReachedMinimum: true,
    minimumCountdown: 0,
    isFullscreen: false,
    onEnterFullscreen: vi.fn(),
    onExitFullscreen: vi.fn(),
    onPauseClick: vi.fn(),
    onEarlyCompleteClick: vi.fn(),
    onInterruptClick: vi.fn(),
    showRuleSelection: false,
    pendingActionType: null,
    sessionContext: {} as any,
    onRuleSelected: vi.fn(),
    onCreateNewRule: vi.fn(),
    onRuleSelectionCancel: vi.fn(),
    showCompletionDialog: false,
    onDirectComplete: vi.fn(),
    onCompletionCancel: vi.fn(),
    showInterruptDialog: false,
    onCancelInterrupt: vi.fn(),
    onConfirmInterrupt: vi.fn(),
    autoResumeAt: null,
    resumeCountdown: 0,
    elapsedPauseTime: 0,
    onResumeNow: vi.fn(),
    onCancelAutoResume: vi.fn(),
    ...overrides,
  };
}

function renderView(props: ComponentProps<typeof FocusModeView>) {
  return render(
    <I18nProvider>
      <FocusModeView {...props} />
    </I18nProvider>
  );
}

describe('FocusModeView', () => {
  beforeEach(() => {
    localStorage.setItem('language', 'en');
  });

  it('should trigger fullscreen and interrupt handlers when session is active', async () => {
    const user = userEvent.setup();
    const props = createProps();

    renderView(props);

    await user.click(screen.getByRole('button', { name: /Enter fullscreen/i }));
    await user.click(screen.getByRole('button', { name: /Interrupt/i }));

    expect(props.onEnterFullscreen).toHaveBeenCalledTimes(1);
    expect(props.onInterruptClick).toHaveBeenCalledTimes(1);
  });

  it('should render optional dialogs when related flags are enabled', () => {
    const props = createProps({
      showRuleSelection: true,
      pendingActionType: 'pause',
      showCompletionDialog: true,
      showInterruptDialog: true,
    });

    renderView(props);

    expect(screen.getByText('mock-rule-selection')).toBeInTheDocument();
    expect(screen.getByText('mock-completion-dialog')).toBeInTheDocument();
    expect(screen.getByText('mock-interrupt-dialog')).toBeInTheDocument();
    expect(screen.getByText('mock-feedback')).toBeInTheDocument();
  });
});
