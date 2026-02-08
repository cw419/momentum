import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppShellViewProps } from '../types';
import { AppShellView } from '../AppShellView';
import {
  createAppState,
  createGroupChain,
  createPetState,
  createUnitChain,
} from '../../../test/factories';

const queryOptimizerMock = vi.hoisted(() => ({
  memoizedBuildChainTree: vi.fn(() => []),
}));

vi.mock('../../../i18n', () => ({
  useI18n: () => ({
    tr: (_zh: string, en: string) => en,
  }),
}));

vi.mock('../../../utils/queryOptimizer', () => ({
  queryOptimizer: queryOptimizerMock,
}));

vi.mock('../../../components/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard">dashboard</div>,
}));

vi.mock('../../../components/RSIPView', () => ({
  RSIPView: () => <div data-testid="rsip-view">rsip</div>,
}));

vi.mock('../../../components/ChainEditor', () => ({
  ChainEditor: () => <div data-testid="chain-editor">editor</div>,
}));

vi.mock('../../../components/FocusMode', () => ({
  FocusMode: () => <div data-testid="focus-mode">focus</div>,
}));

vi.mock('../../../components/ChainDetail', () => ({
  ChainDetail: () => <div data-testid="chain-detail">detail</div>,
}));

vi.mock('../../../components/GroupView', () => ({
  GroupView: () => <div data-testid="group-view">group</div>,
}));

vi.mock('../../../components/TaskGroupEditor', () => ({
  TaskGroupEditor: () => (
    <div data-testid="taskgroup-editor">taskgroup-editor</div>
  ),
}));

vi.mock('../../../components/AuxiliaryJudgment', () => ({
  AuxiliaryJudgment: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="aux-judgment">
      auxiliary
      <button onClick={onCancel}>cancel-aux</button>
    </div>
  ),
}));

vi.mock('../../../components/BettingModal', () => ({
  BettingModal: ({
    chainName,
    taskDuration,
  }: {
    chainName: string;
    taskDuration: number;
  }) => (
    <div data-testid="betting-modal">
      {chainName}:{taskDuration}
    </div>
  ),
}));

vi.mock('../../../components/pet/PetWidget', () => ({
  PetWidget: ({ pet }: { pet: { name: string } | null }) => (
    <div data-testid="pet-widget">{pet?.name ?? 'no-pet'}</div>
  ),
}));

function createProps(
  overrides: Partial<AppShellViewProps> = {},
): AppShellViewProps {
  const chain = createUnitChain({
    id: 'chain-1',
    name: 'Chain One',
    duration: 25,
  });
  const state = createAppState({
    chains: [chain],
    activeSession: {
      chainId: chain.id,
      startedAt: new Date('2026-02-01T10:00:00.000Z'),
      duration: 25,
      isPaused: false,
      totalPausedTime: 0,
    },
    viewingChainId: chain.id,
    currentView: 'dashboard',
  });

  return {
    state,
    isInitialized: true,
    isLoadingData: false,
    showAuxiliaryJudgment: null,
    setShowAuxiliaryJudgment: vi.fn(),
    showBettingModal: false,
    pendingChainId: null,
    currentSessionId: null,
    handleCreateChain: vi.fn(),
    handleCreateTaskGroup: vi.fn(),
    handleEditChain: vi.fn(),
    handleSaveChain: vi.fn(),
    handleViewChainDetail: vi.fn(),
    handleBackToDashboard: vi.fn(),
    openRSIP: vi.fn(),
    saveRSIPNodes: vi.fn(),
    saveRSIPMeta: vi.fn(),
    handleScheduleChain: vi.fn(),
    handleStartChain: vi.fn(async () => undefined),
    handleCancelScheduledSession: vi.fn(),
    handleCompleteBooking: vi.fn(),
    handleCompleteSession: vi.fn(),
    handleInterruptSession: vi.fn(),
    handlePauseSession: vi.fn(),
    handleResumeSession: vi.fn(),
    handleDeleteChain: vi.fn(async () => undefined),
    handleRestoreChains: vi.fn(async () => undefined),
    handlePermanentDeleteChains: vi.fn(async () => undefined),
    handleAuxiliaryJudgmentFailure: vi.fn(),
    handleAuxiliaryJudgmentAllow: vi.fn(),
    handleImportChains: vi.fn(async () => undefined),
    handleImportUnits: vi.fn(async () => undefined),
    handleUpdateTaskRepeatCount: vi.fn(async () => undefined),
    handleReorderUnit: vi.fn(async () => undefined),
    handleBetPlaced: vi.fn(async () => undefined),
    handleBetCancelled: vi.fn(async () => undefined),
    petDomain: {
      pet: createPetState({ name: 'Momo' }),
      mood: 'happy',
      isLoading: false,
      hasPet: true,
      createPet: vi.fn(async () => createPetState()),
      feedPet: vi.fn(async () => null),
      onTaskCompleted: vi.fn(async () => null),
      updatePosition: vi.fn(async () => undefined),
      updateMinimizedPosition: vi.fn(async () => undefined),
      toggleVisibility: vi.fn(async () => undefined),
      showPet: vi.fn(async () => undefined),
      minimize: vi.fn(async () => undefined),
      expand: vi.fn(async () => undefined),
    },
    ...overrides,
  };
}

describe('AppShellView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryOptimizerMock.memoizedBuildChainTree.mockReturnValue([]);
  });

  it('renders initialization screen when app is not initialized', () => {
    render(<AppShellView {...createProps({ isInitialized: false })} />);
    expect(screen.getByText('INITIALIZING APPLICATION')).toBeInTheDocument();
  });

  it('renders dashboard and supports skip-to-content focus', async () => {
    render(<AppShellView {...createProps()} />);

    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
    expect(await screen.findByTestId('pet-widget')).toBeInTheDocument();

    const link = screen.getByText('Skip to main content');
    const main = document.getElementById('main');
    expect(main).toBeInTheDocument();

    fireEvent.click(link);
    expect(main).toHaveFocus();
  });

  it('renders auxiliary judgment and betting modal branches', async () => {
    const setShowAuxiliaryJudgment = vi.fn();
    render(
      <AppShellView
        {...createProps({
          showAuxiliaryJudgment: 'chain-1',
          setShowAuxiliaryJudgment,
          showBettingModal: true,
          pendingChainId: 'chain-1',
          currentSessionId: 'session-1',
        })}
      />,
    );

    expect(await screen.findByTestId('aux-judgment')).toBeInTheDocument();
    expect(await screen.findByTestId('betting-modal')).toHaveTextContent(
      'Chain One:25',
    );

    fireEvent.click(screen.getByText('cancel-aux'));
    expect(setShowAuxiliaryJudgment).toHaveBeenCalledWith(null);
  });

  it('renders editor and taskgroup-editor views', async () => {
    const editorProps = createProps({
      state: createAppState({
        chains: [createUnitChain({ id: 'chain-1' })],
        currentView: 'editor',
      }),
    });

    const { rerender } = render(<AppShellView {...editorProps} />);
    expect(await screen.findByTestId('chain-editor')).toBeInTheDocument();

    rerender(
      <AppShellView
        {...createProps({
          state: createAppState({
            chains: [createUnitChain({ id: 'chain-1' })],
            currentView: 'taskgroup-editor',
          }),
        })}
      />,
    );
    expect(await screen.findByTestId('taskgroup-editor')).toBeInTheDocument();
  });

  it('renders focus/detail/group/rsip views when required state is available', async () => {
    const chain = createUnitChain({ id: 'chain-1', parentId: undefined });
    queryOptimizerMock.memoizedBuildChainTree.mockReturnValue([
      { id: 'chain-1', type: 'group' },
    ]);

    const { rerender } = render(
      <AppShellView
        {...createProps({
          state: createAppState({
            chains: [chain],
            currentView: 'focus',
            activeSession: {
              chainId: chain.id,
              startedAt: new Date(),
              duration: 10,
              isPaused: false,
              totalPausedTime: 0,
            },
          }),
        })}
      />,
    );
    expect(await screen.findByTestId('focus-mode')).toBeInTheDocument();

    rerender(
      <AppShellView
        {...createProps({
          state: createAppState({
            chains: [chain],
            currentView: 'detail',
            viewingChainId: chain.id,
          }),
        })}
      />,
    );
    expect(await screen.findByTestId('chain-detail')).toBeInTheDocument();

    rerender(
      <AppShellView
        {...createProps({
          state: createAppState({
            chains: [{ ...chain, type: 'group' }],
            currentView: 'group',
            viewingChainId: chain.id,
          }),
        })}
      />,
    );
    expect(await screen.findByTestId('group-view')).toBeInTheDocument();

    rerender(
      <AppShellView
        {...createProps({
          state: createAppState({
            chains: [chain],
            currentView: 'rsip',
          }),
        })}
      />,
    );
    expect(await screen.findByTestId('rsip-view')).toBeInTheDocument();
  });

  it('returns null main content for focus/detail/group when prerequisites are missing', () => {
    const { rerender, container } = render(
      <AppShellView
        {...createProps({
          state: createAppState({
            chains: [],
            currentView: 'focus',
            activeSession: null,
          }),
        })}
      />,
    );
    expect(container.querySelector('[data-testid="focus-mode"]')).toBeNull();

    rerender(
      <AppShellView
        {...createProps({
          state: createAppState({
            chains: [],
            currentView: 'detail',
            viewingChainId: 'missing',
          }),
        })}
      />,
    );
    expect(container.querySelector('[data-testid="chain-detail"]')).toBeNull();

    queryOptimizerMock.memoizedBuildChainTree.mockReturnValue([]);
    rerender(
      <AppShellView
        {...createProps({
          state: createAppState({
            chains: [createGroupChain({ id: 'chain-1' })],
            currentView: 'group',
            viewingChainId: 'chain-1',
          }),
        })}
      />,
    );
    expect(container.querySelector('[data-testid="group-view"]')).toBeNull();
  });
});
