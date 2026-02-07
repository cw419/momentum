import { describe, expect, it, vi } from 'vitest';
import type { Chain } from '../../../types';
import { createGroupChain, createUnitChain } from '../../../test/factories';

type MockedPerformanceLogger = {
  time: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  debugLazy: ReturnType<typeof vi.fn>;
};

async function loadBuilderWithEnv(isDevValue: boolean): Promise<{
  buildChainTree: (chains: Chain[]) => ReturnType<(chains: Chain[]) => Chain[]>;
  performanceLogger: MockedPerformanceLogger;
}> {
  vi.resetModules();

  const performanceLogger: MockedPerformanceLogger = {
    time: vi.fn((_label: string, fn: () => unknown) => fn()),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    debugLazy: vi.fn(),
  };

  vi.doMock('../../env', () => ({
    isDev: isDevValue,
    isProd: !isDevValue,
  }));

  vi.doMock('../../performanceLogger', () => ({
    performanceLogger,
  }));

  const { buildChainTree } = await import('../treeBuilder');
  return { buildChainTree, performanceLogger };
}

describe('chain-tree/treeBuilder', () => {
  it('returns empty and logs error for non-array input', async () => {
    const { buildChainTree, performanceLogger } = await loadBuilderWithEnv(false);

    const result = buildChainTree(null as unknown as Chain[]);

    expect(result).toEqual([]);
    expect(performanceLogger.error).toHaveBeenCalledWith(expect.stringMatching(/.+/));
  });

  it('returns early for empty input and emits debug marker', async () => {
    const { buildChainTree, performanceLogger } = await loadBuilderWithEnv(true);

    const result = buildChainTree([]);

    expect(result).toEqual([]);
    expect(performanceLogger.debug).toHaveBeenCalledWith(expect.stringMatching(/.+/));
  });

  it('builds sorted tree structure with correct depth propagation', async () => {
    const { buildChainTree, performanceLogger } = await loadBuilderWithEnv(true);
    const parent = createGroupChain({ id: 'g-1', sortOrder: 2 });
    const otherRoot = createGroupChain({ id: 'g-2', sortOrder: 1 });
    const childA = createUnitChain({ id: 'c-a', parentId: 'g-1', sortOrder: 2 });
    const childB = createUnitChain({ id: 'c-b', parentId: 'g-1', sortOrder: 1 });
    const grandChild = createUnitChain({ id: 'gc', parentId: 'c-b', sortOrder: 1 });

    const result = buildChainTree([parent, otherRoot, childA, childB, grandChild]);

    expect(result.map((node) => node.id)).toEqual(['g-2', 'g-1']);
    expect(result[1].children.map((node) => node.id)).toEqual(['c-b', 'c-a']);
    expect(result[1].children[0].depth).toBe(1);
    expect(result[1].children[0].children[0].id).toBe('gc');
    expect(result[1].children[0].children[0].depth).toBe(2);
    expect(performanceLogger.warn).not.toHaveBeenCalled();
  });

  it('keeps root nodes without parent warnings when parentId is absent', async () => {
    const { buildChainTree, performanceLogger } = await loadBuilderWithEnv(false);
    const root = createUnitChain({ id: 'root-no-parent', parentId: undefined });

    const result = buildChainTree([root]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('root-no-parent');
    expect(performanceLogger.warn).not.toHaveBeenCalled();
  });

  it('logs missing-node errors for two-node circular references', async () => {
    const { buildChainTree, performanceLogger } = await loadBuilderWithEnv(false);
    const nodeA = createUnitChain({ id: 'a', parentId: 'b' });
    const nodeB = createUnitChain({ id: 'b', parentId: 'a' });

    const result = buildChainTree([nodeA, nodeB]);

    expect(result).toEqual([]);
    expect(performanceLogger.error).toHaveBeenCalledWith(
      expect.stringMatching(/.+/),
      expect.arrayContaining(['a', 'b'])
    );
  });

  it('emits extra dev diagnostics only when isDev is true', async () => {
    const dev = await loadBuilderWithEnv(true);
    const prodLike = await loadBuilderWithEnv(false);
    const chain = createUnitChain({ id: 'diag-root' });

    dev.buildChainTree([chain]);
    prodLike.buildChainTree([chain]);

    expect(dev.performanceLogger.debugLazy).toHaveBeenCalledTimes(2);
    expect(prodLike.performanceLogger.debugLazy).toHaveBeenCalledTimes(1);
  });
});
