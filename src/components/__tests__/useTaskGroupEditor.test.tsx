import { act, renderHook } from '@testing-library/react';
import type { FormEvent, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import type { GroupChain } from '../../types';
import {
  AUXILIARY_SIGNAL_TEMPLATES,
  CUSTOM_AUXILIARY_SIGNAL_VALUE,
} from '../chain-editor/constants';
import { useTaskGroupEditor } from '../useTaskGroupEditor';

function groupChain(overrides: Partial<GroupChain> = {}): GroupChain {
  return {
    id: 'group-1',
    parentId: 'parent-1',
    type: 'group',
    sortOrder: 8,
    name: 'Existing group',
    trigger: '任务群容器',
    duration: 0,
    description: 'Existing description',
    currentStreak: 1,
    auxiliaryStreak: 2,
    totalCompletions: 3,
    totalFailures: 4,
    auxiliaryFailures: 5,
    exceptions: ['main-rule'],
    auxiliaryExceptions: ['aux-rule'],
    auxiliarySignal: '打响指',
    auxiliaryDuration: 15,
    auxiliaryCompletionTrigger: 'Start first task',
    timeLimitHours: 48,
    timeLimitExceptions: ['time-rule'],
    isDurationless: true,
    isTaskGroup: true,
    taskRepeatCount: 2,
    groupRepeatCount: 3,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

function submitEvent(): FormEvent {
  return { preventDefault: vi.fn() } as unknown as FormEvent;
}

describe('useTaskGroupEditor', () => {
  beforeEach(() => {
    localStorage.setItem('language', 'en');
    vi.restoreAllMocks();
  });

  it('reports every missing required field and never calls onSave', () => {
    const onSave = vi.fn();
    const event = submitEvent();
    const { result } = renderHook(() => useTaskGroupEditor({ onSave }), {
      wrapper,
    });

    act(() => {
      result.current.handleNameChange('   ');
      result.current.handleDescriptionChange('   ');
      result.current.handleAuxiliarySignalSelect('');
      result.current.handleAuxiliaryCompletionTriggerChange('   ');
    });
    act(() => result.current.handleSubmit(event));

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.errors).toEqual({
      name: 'Please enter a group name',
      description: 'Please enter a group description',
      auxiliarySignal: 'Please choose a booking signal',
      auxiliaryCompletionTrigger: 'Please enter a booking completion condition',
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('restores a saved custom signal and preserves zero sort order on edit', () => {
    const onSave = vi.fn();
    const chain = groupChain({
      sortOrder: 0,
      auxiliarySignal: '  saved custom bell  ',
      auxiliaryDuration: 17,
    });
    const { result } = renderHook(() => useTaskGroupEditor({ chain, onSave }), {
      wrapper,
    });

    expect(result.current.auxiliarySignal).toBe(CUSTOM_AUXILIARY_SIGNAL_VALUE);
    expect(result.current.customAuxiliarySignal).toBe('  saved custom bell  ');
    expect(result.current.isCustomAuxiliaryDuration).toBe(true);

    act(() => result.current.handleSubmit(submitEvent()));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      name: 'Existing group',
      type: 'group',
      parentId: 'parent-1',
      sortOrder: 0,
      trigger: '任务群容器',
      duration: 0,
      isDurationless: true,
      description: 'Existing description',
      auxiliarySignal: 'saved custom bell',
      auxiliaryDuration: 17,
      auxiliaryCompletionTrigger: 'Start first task',
      exceptions: ['main-rule'],
      auxiliaryExceptions: ['aux-rule'],
      isTaskGroup: true,
      groupRepeatCount: 3,
      taskRepeatCount: 2,
      timeLimitHours: 48,
      timeLimitExceptions: ['time-rule'],
    });
  });

  it('submits a new group with trimmed values and deterministic defaults', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const onSave = vi.fn();
    const { result } = renderHook(
      () =>
        useTaskGroupEditor({
          initialParentId: 'initial-parent',
          onSave,
        }),
      { wrapper },
    );

    act(() => {
      result.current.handleNameChange('  New group  ');
      result.current.handleDescriptionChange('  New description  ');
      result.current.handleAuxiliaryCompletionTriggerChange(
        '  Finish booking  ',
      );
      result.current.handleDurationSelect('custom');
    });
    act(() => result.current.handleSubmit(submitEvent()));

    expect(result.current.auxiliarySignal).toBe(
      AUXILIARY_SIGNAL_TEMPLATES[0]?.value,
    );
    expect(result.current.auxiliaryDuration).toBe(25);
    expect(result.current.isCustomAuxiliaryDuration).toBe(true);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New group',
        description: 'New description',
        parentId: 'initial-parent',
        sortOrder: 1_700_000_000,
        auxiliaryDuration: 25,
        auxiliaryCompletionTrigger: 'Finish booking',
        exceptions: [],
        auxiliaryExceptions: [],
        groupRepeatCount: 0,
        taskRepeatCount: 1,
        timeLimitHours: 24,
        timeLimitExceptions: [],
      }),
    );
  });
});
