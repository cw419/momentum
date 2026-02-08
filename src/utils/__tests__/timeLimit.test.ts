import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chain } from '../../types';
import {
  getGroupTimeStatus,
  isGroupExpired,
  resetGroupProgress,
  startGroupTimer,
} from '../timeLimit';

function createGroupChain(overrides: Partial<Chain> = {}): Chain {
  return {
    id: 'group-1',
    name: 'Group One',
    type: 'group',
    sortOrder: 1,
    trigger: 'trigger',
    duration: 30,
    description: 'desc',
    currentStreak: 3,
    auxiliaryStreak: 0,
    totalCompletions: 5,
    totalFailures: 2,
    auxiliaryFailures: 0,
    exceptions: [],
    auxiliaryExceptions: [],
    auxiliarySignal: 'signal',
    auxiliaryDuration: 15,
    auxiliaryCompletionTrigger: 'completion trigger',
    timeLimitExceptions: [],
    createdAt: new Date('2026-02-06T08:00:00.000Z'),
    ...overrides,
  } as Chain;
}

describe('timeLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-06T10:00:00.000Z'));
  });

  describe('isGroupExpired', () => {
    it('returns false when chain is not an active timed group', () => {
      const unit = createGroupChain({ type: 'unit' as Chain['type'] });
      const noLimit = createGroupChain({ timeLimitHours: undefined });
      const noStart = createGroupChain({
        timeLimitHours: 1,
        groupStartedAt: undefined,
      });

      expect(isGroupExpired(unit)).toBe(false);
      expect(isGroupExpired(noLimit)).toBe(false);
      expect(isGroupExpired(noStart)).toBe(false);
    });

    it('returns true when current time is past computed expiration time', () => {
      const chain = createGroupChain({
        timeLimitHours: 1,
        groupStartedAt: new Date('2026-02-06T08:30:00.000Z'),
      });

      expect(isGroupExpired(chain)).toBe(true);
    });

    it('uses explicit groupExpiresAt when provided', () => {
      const notExpired = createGroupChain({
        timeLimitHours: 1,
        groupStartedAt: new Date('2026-02-06T07:00:00.000Z'),
        groupExpiresAt: new Date('2026-02-06T10:30:00.000Z'),
      });
      const expired = createGroupChain({
        timeLimitHours: 6,
        groupStartedAt: new Date('2026-02-06T07:00:00.000Z'),
        groupExpiresAt: new Date('2026-02-06T09:59:59.000Z'),
      });

      expect(isGroupExpired(notExpired)).toBe(false);
      expect(isGroupExpired(expired)).toBe(true);
    });
  });

  describe('startGroupTimer', () => {
    it('returns original chain when not timed group', () => {
      const unit = createGroupChain({ type: 'unit' as Chain['type'] });
      const noLimit = createGroupChain({ timeLimitHours: undefined });

      expect(startGroupTimer(unit)).toBe(unit);
      expect(startGroupTimer(noLimit)).toBe(noLimit);
    });

    it('sets groupStartedAt and groupExpiresAt for timed group', () => {
      const chain = createGroupChain({ timeLimitHours: 2 });
      const result = startGroupTimer(chain);

      expect(result.groupStartedAt?.toISOString()).toBe(
        '2026-02-06T10:00:00.000Z',
      );
      expect(result.groupExpiresAt?.toISOString()).toBe(
        '2026-02-06T12:00:00.000Z',
      );
    });
  });

  describe('resetGroupProgress', () => {
    it('resets streak and timer fields and increments failures for group chains', () => {
      const chain = createGroupChain({
        currentStreak: 8,
        totalFailures: 3,
        groupStartedAt: new Date('2026-02-06T09:00:00.000Z'),
        groupExpiresAt: new Date('2026-02-06T11:00:00.000Z'),
      });

      const result = resetGroupProgress(chain);

      expect(result.currentStreak).toBe(0);
      expect(result.totalFailures).toBe(4);
      expect(result.groupStartedAt).toBeUndefined();
      expect(result.groupExpiresAt).toBeUndefined();
    });

    it('returns original value for non-group chains', () => {
      const chain = createGroupChain({ type: 'unit' as Chain['type'] });
      expect(resetGroupProgress(chain)).toBe(chain);
    });
  });

  describe('getGroupTimeStatus', () => {
    it('returns no-limit status for untimed chains', () => {
      const chain = createGroupChain({
        timeLimitHours: undefined,
        groupStartedAt: undefined,
      });

      expect(getGroupTimeStatus(chain, 'en')).toEqual({
        isExpired: false,
        remainingTime: 0,
        formattedTime: 'No time limit',
        progress: 0,
      });
      const zhStatus = getGroupTimeStatus(chain, 'zh');
      expect(zhStatus.isExpired).toBe(false);
      expect(zhStatus.remainingTime).toBe(0);
      expect(zhStatus.formattedTime).not.toBe('');
    });

    it('formats hour/minute remaining time for active group', () => {
      const chain = createGroupChain({
        timeLimitHours: 2,
        groupStartedAt: new Date('2026-02-06T09:30:00.000Z'),
      });

      const status = getGroupTimeStatus(chain, 'en');

      expect(status.isExpired).toBe(false);
      expect(status.formattedTime).toBe('1h 30m');
      expect(status.progress).toBeCloseTo(0.25, 4);
    });

    it('formats minute/second and second-only remaining time', () => {
      const minuteSecond = createGroupChain({
        timeLimitHours: 1,
        groupStartedAt: new Date('2026-02-06T09:00:00.000Z'),
        groupExpiresAt: new Date('2026-02-06T10:01:05.000Z'),
      });
      const secondOnly = createGroupChain({
        timeLimitHours: 1,
        groupStartedAt: new Date('2026-02-06T09:00:00.000Z'),
        groupExpiresAt: new Date('2026-02-06T10:00:20.000Z'),
      });

      expect(getGroupTimeStatus(minuteSecond, 'en').formattedTime).toBe(
        '1m 5s',
      );
      expect(getGroupTimeStatus(secondOnly, 'en').formattedTime).toBe('20s');
    });

    it('returns expired status when time is over', () => {
      const chain = createGroupChain({
        timeLimitHours: 1,
        groupStartedAt: new Date('2026-02-06T08:00:00.000Z'),
        groupExpiresAt: new Date('2026-02-06T09:30:00.000Z'),
      });

      const status = getGroupTimeStatus(chain, 'en');
      expect(status.isExpired).toBe(true);
      expect(status.remainingTime).toBe(0);
      expect(status.formattedTime).toBe('Expired');
      expect(status.progress).toBe(1);
    });
  });
});
