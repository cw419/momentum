import { beforeEach, describe, expect, it } from 'vitest';
import { createPetState } from '../../../test/factories';
import { STORAGE_KEYS } from '../keys';
import { getPetState, savePetState } from '../pet';

describe('storage/pet', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when pet state is missing', () => {
    expect(getPetState()).toBeNull();
  });

  it('hydrates dates and migrates missing minimized fields', () => {
    const base = createPetState({
      id: 'pet-legacy',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      lastFedAt: new Date('2026-01-01T01:00:00.000Z'),
      lastInteractedAt: new Date('2026-01-01T02:00:00.000Z'),
      lastDecayCalculatedAt: new Date('2026-01-01T03:00:00.000Z'),
    });

    const legacy = {
      ...base,
      isMinimized: undefined,
      minimizedPosition: undefined,
    };

    localStorage.setItem(STORAGE_KEYS.PET_STATE, JSON.stringify(legacy));
    const hydrated = getPetState();

    expect(hydrated).not.toBeNull();
    expect(hydrated?.createdAt).toBeInstanceOf(Date);
    expect(hydrated?.lastFedAt).toBeInstanceOf(Date);
    expect(hydrated?.lastInteractedAt).toBeInstanceOf(Date);
    expect(hydrated?.lastDecayCalculatedAt).toBeInstanceOf(Date);
    expect(hydrated?.isMinimized).toBe(false);
    expect(hydrated?.minimizedPosition).toEqual({ x: 92, y: 2 });
  });

  it('serializes date fields to ISO when saving', () => {
    const pet = createPetState({
      id: 'pet-save',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      lastFedAt: new Date('2026-02-01T01:00:00.000Z'),
      lastInteractedAt: new Date('2026-02-01T02:00:00.000Z'),
      lastDecayCalculatedAt: new Date('2026-02-01T03:00:00.000Z'),
    });

    savePetState(pet);
    const raw = localStorage.getItem(STORAGE_KEYS.PET_STATE);

    expect(raw).toContain('2026-02-01T00:00:00.000Z');
    expect(raw).toContain('2026-02-01T01:00:00.000Z');
    expect(raw).toContain('2026-02-01T02:00:00.000Z');
    expect(raw).toContain('2026-02-01T03:00:00.000Z');
  });
});
