import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  supabaseValue: {} as unknown,
  getTableInfo: vi.fn(),
  getSchemaStatus: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  get supabase() {
    return mockState.supabaseValue;
  },
}));

vi.mock('../../schemaChecker', () => ({
  schemaChecker: {
    getTableInfo: mockState.getTableInfo,
    getSchemaStatus: mockState.getSchemaStatus,
  },
}));

vi.mock('../../logger', () => ({
  logger: {
    error: mockState.loggerError,
  },
}));

import { MigrationHelper } from '../MigrationHelper';

const makeTable = (...columns: string[]) => ({
  columns: columns.map((column_name) => ({ column_name })),
});

describe('MigrationHelper', () => {
  beforeEach(() => {
    mockState.supabaseValue = {};
    mockState.getTableInfo.mockReset();
    mockState.getSchemaStatus.mockReset();
    mockState.loggerError.mockReset();
  });

  it('returns false when Supabase is unavailable', async () => {
    mockState.supabaseValue = null;
    const helper = new MigrationHelper();

    expect(await helper.isMigrationApplied('20250730021823_winter_flame')).toBe(
      false,
    );
  });

  it('checks migration conditions by expected schema columns/tables', async () => {
    mockState.supabaseValue = {};
    mockState.getTableInfo.mockImplementation(async (tableName: string) => {
      if (tableName === 'chains') {
        return makeTable(
          'id',
          'parent_id',
          'type',
          'time_limit_hours',
          'group_started_at',
          'group_expires_at',
          'is_durationless',
        );
      }
      if (tableName === 'rsip_nodes') return makeTable('id');
      if (tableName === 'rsip_meta') return makeTable('id');
      return null;
    });

    const helper = new MigrationHelper();

    expect(await helper.isMigrationApplied('20250730021823_winter_flame')).toBe(
      true,
    );
    expect(
      await helper.isMigrationApplied('20250801160754_peaceful_palace'),
    ).toBe(true);
    expect(
      await helper.isMigrationApplied('20250801161456_fading_sunset'),
    ).toBe(true);
    expect(
      await helper.isMigrationApplied('20250808000000_add_group_time_limit'),
    ).toBe(true);
    expect(
      await helper.isMigrationApplied('20250808001000_add_durationless_flag'),
    ).toBe(true);
    expect(
      await helper.isMigrationApplied('20250810000000_add_rsip_tables'),
    ).toBe(true);
    expect(await helper.isMigrationApplied('unknown-migration')).toBe(false);
  });

  it('returns false and logs when schema inspection throws', async () => {
    mockState.supabaseValue = {};
    mockState.getTableInfo.mockRejectedValue(new Error('schema failure'));

    const helper = new MigrationHelper();
    const applied = await helper.isMigrationApplied(
      '20250730021823_winter_flame',
    );

    expect(applied).toBe(false);
    expect(mockState.loggerError).toHaveBeenCalled();
  });

  it('generates SQL and report for missing migrations', async () => {
    mockState.getTableInfo.mockImplementation(async (tableName: string) =>
      tableName === 'chains' ? makeTable('id', 'parent_id', 'type') : null,
    );
    mockState.getSchemaStatus.mockResolvedValue({
      migrationStatus: 'partial',
      recommendations: ['Apply missing migrations'],
    });
    const helper = new MigrationHelper();

    const sql = await helper.generateMigrationSQL();
    expect(sql).not.toContain('20250730021823_winter_flame');
    expect(sql).not.toContain('20250801160754_peaceful_palace');
    expect(sql).toContain('20250808000000_add_group_time_limit');
    expect(sql).toContain('20250808001000_add_durationless_flag');
    expect(sql).toContain('20250810000000_add_rsip_tables');

    const report = await helper.generateMigrationReport();
    expect(report).toContain('# ');
    expect(report).toContain('20250808000000_add_group_time_limit');
    expect(report).toContain('Apply missing migrations');
    expect(report).toContain('```sql');
  });
});
