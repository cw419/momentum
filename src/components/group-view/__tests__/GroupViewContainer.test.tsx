import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainTreeNode } from '../../../types';
import { GroupView } from '../GroupViewContainer';

const getGroupProgressMock = vi.hoisted(() => vi.fn());
const getGroupUnitProgressMock = vi.hoisted(() => vi.fn());
const getNextUnitInGroupMock = vi.hoisted(() => vi.fn());
const getChainTypeConfigMock = vi.hoisted(() => vi.fn());
const getGroupTimeStatusMock = vi.hoisted(() => vi.fn());

vi.mock('../../../utils/chainTree', () => ({
  getGroupProgress: getGroupProgressMock,
  getGroupUnitProgress: getGroupUnitProgressMock,
  getNextUnitInGroup: getNextUnitInGroupMock,
  getChainTypeConfig: getChainTypeConfigMock,
}));

vi.mock('../../../utils/timeLimit', () => ({
  getGroupTimeStatus: getGroupTimeStatusMock,
}));

vi.mock('../../../i18n', () => ({
  useI18n: () => ({
    language: 'en',
    tr: (_zh: string, en: string) => en,
  }),
}));

vi.mock('../GroupViewView', () => ({
  GroupViewView: (props: {
    getScheduledSession: (chainId: string) => unknown;
    handleOpenRepeatModal: (unit: ChainTreeNode) => void;
    setRepeatCount: (value: number) => void;
    handleUpdateRepeatCount: () => void;
    availableUnits: Array<{ id: string }>;
  }) => (
    <div>
      <div data-testid="scheduled-found">
        {props.getScheduledSession('unit-1') ? 'yes' : 'no'}
      </div>
      <button
        onClick={() =>
          props.handleOpenRepeatModal({
            id: 'unit-1',
            taskRepeatCount: 2,
          } as ChainTreeNode)
        }
      >
        open-repeat
      </button>
      <button
        onClick={() => {
          props.setRepeatCount(6);
          props.handleUpdateRepeatCount();
        }}
      >
        confirm-repeat
      </button>
      <div data-testid="unit-count">{props.availableUnits.length}</div>
    </div>
  ),
}));

function createGroupNode(): ChainTreeNode {
  return {
    id: 'group-1',
    name: 'Group',
    type: 'group',
    sortOrder: 1,
    trigger: 'trigger',
    duration: 30,
    description: 'desc',
    currentStreak: 0,
    auxiliaryStreak: 0,
    totalCompletions: 0,
    totalFailures: 0,
    auxiliaryFailures: 0,
    exceptions: [],
    auxiliaryExceptions: [],
    auxiliarySignal: '',
    auxiliaryDuration: 10,
    auxiliaryCompletionTrigger: '',
    timeLimitExceptions: [],
    createdAt: new Date('2026-02-06T00:00:00.000Z'),
    children: [],
    depth: 0,
  };
}

describe('GroupViewContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGroupProgressMock.mockReturnValue({ completed: 1, total: 2 });
    getGroupUnitProgressMock.mockReturnValue({ completed: 1, total: 3 });
    getNextUnitInGroupMock.mockReturnValue({ id: 'unit-1' });
    getChainTypeConfigMock.mockReturnValue({ color: '#fff' });
    getGroupTimeStatusMock.mockReturnValue({
      isExpired: false,
      remainingTime: 1000,
      formattedTime: '16m',
      progress: 0.2,
    });
  });

  it('maps scheduled sessions and handles repeat-count update workflow', () => {
    const onUpdateTaskRepeatCount = vi.fn();
    render(
      <GroupView
        group={createGroupNode()}
        scheduledSessions={[
          {
            chainId: 'unit-1',
            scheduledAt: new Date('2026-02-06T01:00:00.000Z'),
            expiresAt: new Date('2026-02-06T02:00:00.000Z'),
            auxiliarySignal: 'signal',
          },
        ]}
        availableUnits={[{ id: 'unit-1' } as never]}
        onBack={vi.fn()}
        onStartChain={vi.fn()}
        onScheduleChain={vi.fn()}
        onEditChain={vi.fn()}
        onDeleteChain={vi.fn()}
        onAddUnit={vi.fn()}
        onImportUnits={vi.fn()}
        onUpdateTaskRepeatCount={onUpdateTaskRepeatCount}
        onReorderUnit={vi.fn()}
        onViewDetail={vi.fn()}
      />
    );

    expect(screen.getByTestId('scheduled-found').textContent).toBe('yes');
    expect(screen.getByTestId('unit-count').textContent).toBe('1');

    fireEvent.click(screen.getByText('open-repeat'));
    act(() => {
      fireEvent.click(screen.getByText('confirm-repeat'));
    });

    expect(onUpdateTaskRepeatCount).toHaveBeenCalledWith('unit-1', 2);
  });
});
