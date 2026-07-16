import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  archiveRSIPNodesAndRemove,
  appendRSIPRunRecord,
  createRSIPNodesWithMeta,
  removeRSIPNodes,
  upsertRSIPLibraryEntry,
  upsertRSIPNode,
} from '../rsipIntents';
import { createMockContext, createSupabaseError } from './testHelpers';

function mockAtomicRpcSuccess(ctx: ReturnType<typeof createMockContext>) {
  ctx.mockClient.rpc = vi.fn().mockImplementation((name, args) => {
    if (name === 'create_rsip_nodes_with_meta') {
      return Promise.resolve({
        data: { nodes: args.p_nodes, meta: args.p_meta },
        error: null,
      });
    }
    return Promise.resolve({
      data: {
        removed_node_ids: args.p_node_ids,
        library_entries: [
          {
            id: args.p_node_ids[0],
            user_id: 'test-user-123',
            title: 'Server archive',
            rule: 'Authoritative values',
            type: null,
            emoji: null,
            cumulative_execution_days: 12,
            internalization_progress: 20,
            last_active_at: '2026-07-16T02:00:00.000Z',
            times_used: 3,
            use_timer: false,
            timer_minutes: null,
            is_passive: false,
            updated_at: '2026-07-16T02:00:00.000Z',
          },
        ],
      },
      error: null,
    });
  });
}

describe('supabase/rsipIntents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts or updates a single RSIP node with onConflict id', async () => {
    const ctx = createMockContext();
    const upsert = vi.fn().mockReturnValue({ error: null });

    ctx.mockClient.from = vi.fn().mockReturnValue({ upsert });

    await upsertRSIPNode(ctx, {
      id: 'node-1',
      title: 'Node',
      rule: 'Rule',
      sortOrder: 0,
      createdAt: new Date('2026-03-07T00:00:00.000Z'),
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'node-1',
        title: 'Node',
        user_id: 'test-user-123',
      }),
      { onConflict: 'id' },
    );
  });

  it('sends node creation and metadata through one atomic RPC', async () => {
    const ctx = createMockContext();
    mockAtomicRpcSuccess(ctx);

    const result = await createRSIPNodesWithMeta(
      ctx,
      [
        {
          id: '00000000-0000-4000-8000-000000000001',
          title: 'Atomic node',
          rule: 'Persist together',
          sortOrder: 2,
          createdAt: new Date('2026-07-16T01:00:00.000Z'),
        },
      ],
      {
        lastAddedAt: new Date('2026-07-16T01:00:00.000Z'),
        allowMultiplePerDay: false,
      },
    );

    expect(ctx.mockClient.rpc).toHaveBeenCalledOnce();
    expect(ctx.mockClient.rpc).toHaveBeenCalledWith(
      'create_rsip_nodes_with_meta',
      {
        p_intent_key: '00000000-0000-4000-8000-000000000001',
        p_nodes: [
          expect.objectContaining({
            id: '00000000-0000-4000-8000-000000000001',
            user_id: 'test-user-123',
            title: 'Atomic node',
          }),
        ],
        p_meta: expect.objectContaining({
          user_id: 'test-user-123',
          last_added_at: '2026-07-16T01:00:00.000Z',
          allow_multiple_per_day: false,
        }),
      },
    );
    expect(result).toEqual({
      nodes: [expect.objectContaining({ id: expect.any(String) })],
      meta: expect.objectContaining({
        lastAddedAt: new Date('2026-07-16T01:00:00.000Z'),
      }),
    });
  });

  it('rejects duplicate node ids before invoking the creation RPC', async () => {
    const ctx = createMockContext();
    const node = {
      id: 'duplicate',
      title: 'Duplicate',
      rule: 'Reject ambiguity',
      sortOrder: 0,
      createdAt: new Date('2026-07-16T01:00:00.000Z'),
    };

    await expect(
      createRSIPNodesWithMeta(ctx, [node, node], {}),
    ).rejects.toThrow('duplicate RSIP node ids');
    expect(ctx.mockClient.rpc).not.toHaveBeenCalled();
  });

  it('archives the server-owned descendant closure through one RPC', async () => {
    const ctx = createMockContext();
    mockAtomicRpcSuccess(ctx);

    const result = await archiveRSIPNodesAndRemove(
      ctx,
      [
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000001',
      ],
      [
        {
          id: '00000000-0000-4000-8000-000000000001',
          title: 'Archived node',
          rule: 'Archive before delete',
          cumulativeExecutionDays: 8,
          internalizationProgress: 13.33,
          lastActiveAt: new Date('2026-07-16T02:00:00.000Z'),
          timesUsed: 3,
        },
        {
          id: '00000000-0000-4000-8000-000000000099',
          title: 'Unrelated entry',
          rule: 'Must not cross the RPC boundary',
          cumulativeExecutionDays: 2,
          internalizationProgress: 3.33,
          lastActiveAt: new Date('2026-07-15T02:00:00.000Z'),
          timesUsed: 1,
        },
      ],
    );

    expect(ctx.mockClient.rpc).toHaveBeenCalledWith(
      'archive_rsip_nodes_and_remove',
      {
        p_intent_key: '00000000-0000-4000-8000-000000000001',
        p_node_ids: ['00000000-0000-4000-8000-000000000001'],
      },
    );
    expect(result).toEqual({
      removedNodeIds: ['00000000-0000-4000-8000-000000000001'],
      libraryEntries: [
        expect.objectContaining({
          id: '00000000-0000-4000-8000-000000000001',
          title: 'Server archive',
          cumulativeExecutionDays: 12,
        }),
      ],
    });
  });

  it('rejects atomic intents without authentication before any RPC', async () => {
    const ctx = createMockContext({ user: null, isAuthenticated: false });

    await expect(createRSIPNodesWithMeta(ctx, [], {})).rejects.toThrow(
      'without a user',
    );
    await expect(
      archiveRSIPNodesAndRemove(ctx, ['node-1'], []),
    ).rejects.toThrow('without a user');

    expect(ctx.mockClient.rpc).not.toHaveBeenCalled();
  });

  it('propagates atomic RPC failures instead of falling back to split writes', async () => {
    const ctx = createMockContext();
    ctx.mockClient.rpc = vi.fn().mockResolvedValue({
      data: null,
      error: createSupabaseError('PGRST202', 'RPC is unavailable'),
    });

    await expect(createRSIPNodesWithMeta(ctx, [], {})).rejects.toThrow(
      'Failed to create RSIP nodes with metadata',
    );
    await expect(
      archiveRSIPNodesAndRemove(ctx, ['node-1'], []),
    ).rejects.toThrow('Failed to archive and remove RSIP nodes');
    expect(ctx.mockClient.rpc).toHaveBeenCalledTimes(2);
  });

  it('surfaces missing migrated node columns without retrying', async () => {
    const ctx = createMockContext();
    const upsert = vi.fn().mockReturnValue({
      error: createSupabaseError(
        'PGRST204',
        "Could not find the 'consecutive_executions' column",
      ),
    });
    ctx.mockClient.from = vi.fn().mockReturnValue({ upsert });

    await expect(
      upsertRSIPNode(ctx, {
        id: 'node-1',
        title: 'Node',
        rule: 'Rule',
        sortOrder: 0,
        createdAt: new Date('2026-03-07T00:00:00.000Z'),
      }),
    ).rejects.toThrow('Failed to upsert RSIP node');

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0]?.[0]).toHaveProperty('consecutive_executions');
    expect(ctx.markSchemaCapabilityMissing).not.toHaveBeenCalled();
  });

  it('removes multiple RSIP nodes in one delete call', async () => {
    const ctx = createMockContext();
    const eq = vi.fn().mockResolvedValue({ error: null });
    const inMock = vi.fn().mockReturnValue({ eq });
    const deleteMock = vi.fn().mockReturnValue({ in: inMock });

    ctx.mockClient.from = vi.fn().mockReturnValue({ delete: deleteMock });

    await removeRSIPNodes(ctx, ['node-1', 'node-2']);

    expect(inMock).toHaveBeenCalledWith('id', ['node-1', 'node-2']);
    expect(eq).toHaveBeenCalledWith('user_id', 'test-user-123');
  });

  it('inserts or updates RSIP library entries against the composite key', async () => {
    const ctx = createMockContext();
    const upsert = vi.fn().mockReturnValue({ error: null });

    ctx.mockClient.from = vi.fn().mockReturnValue({ upsert });

    await upsertRSIPLibraryEntry(ctx, {
      id: 'library-1',
      title: 'Library',
      rule: 'Rule',
      cumulativeExecutionDays: 1,
      internalizationProgress: 1,
      lastActiveAt: new Date('2026-03-07T00:00:00.000Z'),
      timesUsed: 1,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'library-1',
        title: 'Library',
        user_id: 'test-user-123',
      }),
      { onConflict: 'user_id,id' },
    );
  });

  it('appends RSIP run records and surfaces insert failures', async () => {
    const ctx = createMockContext();
    const insert = vi
      .fn()
      .mockReturnValueOnce({
        error: createSupabaseError('UNKNOWN', 'insert failed'),
      })
      .mockReturnValueOnce({ error: null });

    ctx.mockClient.from = vi.fn().mockReturnValue({ insert });

    await expect(
      appendRSIPRunRecord(ctx, {
        runNumber: 1,
        startedAt: new Date('2026-03-07T00:00:00.000Z'),
        maxNodeCount: 1,
        durationDays: 1,
      }),
    ).rejects.toThrow('Failed to append rsip run history record');

    await expect(
      appendRSIPRunRecord(ctx, {
        runNumber: 2,
        startedAt: new Date('2026-03-08T00:00:00.000Z'),
        maxNodeCount: 2,
        durationDays: 1,
      }),
    ).resolves.toBeUndefined();
  });
});
