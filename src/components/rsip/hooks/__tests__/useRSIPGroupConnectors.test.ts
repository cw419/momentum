import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RSIPGroupFrame } from '../useRSIPLayout';
import { useRSIPGroupConnectors } from '../useRSIPGroupConnectors';

const frames: RSIPGroupFrame[] = [
  {
    id: 'parent',
    title: 'Parent group',
    style: { left: 20, top: 20, width: 256, height: 160 },
  },
  {
    id: 'child',
    parentGroupId: 'parent',
    title: 'Child group',
    style: { left: 340, top: 300, width: 256, height: 160 },
  },
];

describe('useRSIPGroupConnectors', () => {
  it('draws a directed connector from each parent group to its child group', () => {
    const { result } = renderHook(() => useRSIPGroupConnectors(frames));

    expect(result.current).toEqual([
      expect.objectContaining({
        id: 'group-parent-child',
        d: expect.stringContaining('M 148 180'),
      }),
    ]);
  });
});
