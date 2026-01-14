import { describe, expect, it } from 'vitest';
import { seedTestData, testDbUtils } from '../../test/utils/testDatabase';

describe('Test database harness (in-memory)', () => {
  it('seeds and filters data as expected', async () => {
    await seedTestData();

    const allChains = await testDbUtils.query('chains');
    expect(allChains).toHaveLength(3);

    const activeChains = await testDbUtils.query('chains', {
      user_id: 'eq.test-user-123',
      deleted_at: 'is.null',
    });
    expect(activeChains).toHaveLength(2);

    const deletedChains = await testDbUtils.query('chains', {
      deleted_at: 'not.is.null',
    });
    expect(deletedChains).toHaveLength(1);
  });

  it('supports basic insert/update/delete lifecycle', async () => {
    await testDbUtils.insert('chains', {
      id: 'chain-smoke-1',
      name: 'Smoke Chain',
      trigger: 'Smoke',
      duration: 45,
      description: 'Smoke test chain',
      user_id: 'test-user-123',
      deleted_at: null,
    });

    const afterInsert = await testDbUtils.query('chains');
    expect(afterInsert).toHaveLength(1);

    await testDbUtils.update('chains', 'chain-smoke-1', { name: 'Updated Smoke Chain' });
    const afterUpdate = await testDbUtils.query('chains');
    expect(afterUpdate[0].name).toBe('Updated Smoke Chain');

    await testDbUtils.delete('chains', 'chain-smoke-1');
    const afterDelete = await testDbUtils.query('chains');
    expect(afterDelete).toHaveLength(0);
  });
});

