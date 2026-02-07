import { describe, expect, it } from 'vitest';
import { getChainTypeConfig } from '../chainTypeConfig';

describe('chain-tree/chainTypeConfig', () => {
  it('returns english config for known chain types', () => {
    expect(getChainTypeConfig('unit', 'en')).toMatchObject({
      icon: 'link',
      name: 'Unit',
    });
    expect(getChainTypeConfig('group', 'en')).toMatchObject({
      icon: 'layers',
      name: 'Group',
    });
    expect(getChainTypeConfig('special_ops', 'en')).toMatchObject({
      icon: 'wrench',
      name: 'Special ops',
    });
  });

  it('returns zh names when zh language is selected', () => {
    const config = getChainTypeConfig('engineering', 'zh');
    expect(config.icon).toBe('dumbbell');
    expect(config.name).toBeTruthy();
    expect(config.name).not.toBe('Engineering');
  });

  it('falls back to unit config when an unknown type is provided', () => {
    const config = getChainTypeConfig('invalid-type' as never, 'en');
    expect(config).toMatchObject({
      icon: 'link',
      name: 'Unit',
    });
  });
});
