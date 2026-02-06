import type { PetState, SerializedPetState } from '../../types/pet';
import { STORAGE_KEYS } from './keys';

export function getPetState(): PetState | null {
  const data = localStorage.getItem(STORAGE_KEYS.PET_STATE);
  if (!data) return null;

  const serialized: SerializedPetState = JSON.parse(data);
  return {
    ...serialized,
    // Migration: add default values for new fields if they don't exist
    isMinimized: serialized.isMinimized ?? false,
    minimizedPosition: serialized.minimizedPosition ?? { x: 92, y: 2 },
    createdAt: new Date(serialized.createdAt),
    lastFedAt: new Date(serialized.lastFedAt),
    lastInteractedAt: new Date(serialized.lastInteractedAt),
    lastDecayCalculatedAt: new Date(serialized.lastDecayCalculatedAt),
  };
}

export function savePetState(pet: PetState): void {
  const serialized: SerializedPetState = {
    ...pet,
    createdAt: pet.createdAt.toISOString(),
    lastFedAt: pet.lastFedAt.toISOString(),
    lastInteractedAt: pet.lastInteractedAt.toISOString(),
    lastDecayCalculatedAt: pet.lastDecayCalculatedAt.toISOString(),
  };
  localStorage.setItem(STORAGE_KEYS.PET_STATE, JSON.stringify(serialized));
}

