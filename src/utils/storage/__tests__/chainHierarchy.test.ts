import { describe, expect, it } from 'vitest';
import { createGroupChain, createUnitChain } from '../../../test/factories';
import { collectDescendantIds } from '../chainHierarchy';

describe('storage/chainHierarchy', () => {
  it('collects all descendants recursively', () => {
    const chains = [
      createGroupChain({ id: 'root', parentId: undefined }),
      createUnitChain({ id: 'child-1', parentId: 'root' }),
      createGroupChain({ id: 'child-2', parentId: 'root' }),
      createUnitChain({ id: 'grandchild', parentId: 'child-2' }),
    ];

    const descendants = collectDescendantIds('root', chains);
    expect([...descendants].sort()).toEqual(['child-1', 'child-2', 'grandchild']);
  });

  it('returns an empty set for unknown roots', () => {
    const descendants = collectDescendantIds('missing', [createUnitChain({ id: 'unit' })]);
    expect(descendants.size).toBe(0);
  });

  it('handles cyclical relationships without infinite loops', () => {
    const chains = [
      createGroupChain({ id: 'root', parentId: undefined }),
      createGroupChain({ id: 'a', parentId: 'root' }),
      createGroupChain({ id: 'b', parentId: 'a' }),
      createGroupChain({ id: 'a', parentId: 'b' }),
    ];

    const descendants = collectDescendantIds('root', chains);
    expect(descendants.has('a')).toBe(true);
    expect(descendants.has('b')).toBe(true);
  });
});
