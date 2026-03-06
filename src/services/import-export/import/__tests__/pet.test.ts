import { describe, expect, test } from 'vitest';
import { parseImportPetState } from '../pet';

describe('import/pet parser', () => {
  test('returns undefined for non-object payloads', () => {
    expect(parseImportPetState(null)).toBeUndefined();
    expect(parseImportPetState('nope')).toBeUndefined();
    expect(parseImportPetState(123)).toBeUndefined();
  });

  test('parses full pet state and converts dates', () => {
    const parsed = parseImportPetState({
      id: 'pet-1',
      name: 'Pixel',
      hunger: 10,
      happiness: 90,
      health: 88,
      level: 5,
      experience: 66,
      stage: 'child',
      createdAt: '2026-01-01T00:00:00.000Z',
      lastFedAt: '2026-01-02T00:00:00.000Z',
      lastInteractedAt: '2026-01-03T00:00:00.000Z',
      lastDecayCalculatedAt: '2026-01-04T00:00:00.000Z',
      isVisible: true,
      isMinimized: false,
      position: { x: 12, y: 34 },
      minimizedPosition: { x: 92, y: 2 },
    });

    expect(parsed).toBeDefined();
    expect(parsed?.name).toBe('Pixel');
    expect(parsed?.stage).toBe('child');
    expect(parsed?.createdAt).toBeInstanceOf(Date);
    expect(parsed?.lastFedAt).toBeInstanceOf(Date);
    expect(parsed?.lastInteractedAt).toBeInstanceOf(Date);
    expect(parsed?.lastDecayCalculatedAt).toBeInstanceOf(Date);
    expect(parsed?.position).toEqual({ x: 12, y: 34 });
  });

  test('falls back for invalid dates and malformed positions', () => {
    const parsed = parseImportPetState({
      id: 'pet-1',
      name: 'Pixel',
      hunger: 10,
      happiness: 90,
      health: 88,
      level: 5,
      experience: 66,
      stage: 'unknown-stage',
      createdAt: 'invalid',
      lastFedAt: null,
      lastInteractedAt: undefined,
      lastDecayCalculatedAt: 0,
      isVisible: true,
      isMinimized: false,
      position: { x: 'bad', y: 10 },
      minimizedPosition: null,
    });

    expect(parsed).toBeDefined();
    expect(parsed?.stage).toBe('egg');
    expect(parsed?.createdAt).toBeInstanceOf(Date);
    expect(parsed?.lastFedAt).toBeInstanceOf(Date);
    expect(parsed?.position).toEqual({ x: 80, y: 80 });
    expect(parsed?.minimizedPosition).toEqual({ x: 92, y: 2 });
  });
});
