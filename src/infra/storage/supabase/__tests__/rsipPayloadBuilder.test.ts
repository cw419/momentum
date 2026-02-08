import { describe, expect, it } from 'vitest';
import { buildRSIPNodeRows } from '../rsipPayloadBuilder';

describe('buildRSIPNodeRows', () => {
  const nodes = [
    {
      id: 'n1',
      parentId: undefined,
      title: 'Node 1',
      rule: 'Do it',
      sortOrder: 1,
      createdAt: new Date('2026-02-07T00:00:00.000Z'),
      useTimer: true,
      timerMinutes: 20,
      emoji: '🔥',
      stabilityPhase: 'E1',
      phaseStartedAt: new Date('2026-02-07T00:10:00.000Z'),
      lastExecutedAt: new Date('2026-02-07T00:20:00.000Z'),
      lastViolatedAt: new Date('2026-02-07T00:30:00.000Z'),
      consecutiveExecutions: 2,
      consecutiveViolations: 1,
      totalExecutions: 10,
      totalViolations: 3,
    },
  ];

  it('builds strict payload with all columns', () => {
    const rows = buildRSIPNodeRows(nodes, 'user-1', { strict: true });
    expect(rows).toHaveLength(1);

    const row = rows[0] as Record<string, unknown>;
    expect(row.user_id).toBe('user-1');
    expect(row).toHaveProperty('consecutive_executions', 2);
    expect(row).toHaveProperty('stability_phase', 'E1');
  });

  it('builds basic payload without strict-only columns', () => {
    const rows = buildRSIPNodeRows(nodes, 'user-1', { strict: false });
    expect(rows).toHaveLength(1);

    const row = rows[0] as Record<string, unknown>;
    expect(row).not.toHaveProperty('consecutive_executions');
    expect(row).not.toHaveProperty('stability_phase');
    expect(row.user_id).toBe('user-1');
  });
});
