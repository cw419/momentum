import type { PetState } from '../../types/pet';

function fixedDate(): Date {
  return new Date('2026-02-06T00:00:00.000Z');
}

export function createPetState(overrides: Partial<PetState> = {}): PetState {
  const baseDate = fixedDate();
  return {
    id: overrides.id ?? 'pet-1',
    name: overrides.name ?? 'Pixel',
    hunger: overrides.hunger ?? 50,
    happiness: overrides.happiness ?? 70,
    health: overrides.health ?? 100,
    level: overrides.level ?? 1,
    experience: overrides.experience ?? 0,
    stage: overrides.stage ?? 'egg',
    createdAt: overrides.createdAt ?? baseDate,
    lastFedAt: overrides.lastFedAt ?? baseDate,
    lastInteractedAt: overrides.lastInteractedAt ?? baseDate,
    lastDecayCalculatedAt: overrides.lastDecayCalculatedAt ?? baseDate,
    isVisible: overrides.isVisible ?? true,
    isMinimized: overrides.isMinimized ?? false,
    position: overrides.position ?? { x: 80, y: 80 },
    minimizedPosition: overrides.minimizedPosition ?? { x: 92, y: 2 },
  };
}

