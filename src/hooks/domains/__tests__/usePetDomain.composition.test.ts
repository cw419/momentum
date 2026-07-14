import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalStorageMock } from '../../../test/factories';
import type { PetState, TaskCompletionReward } from '../../../types/pet';
import { useStorage } from '../../../storage/useStorage';
import { usePetDomain } from '../usePetDomain';

vi.mock('../../../storage/useStorage', () => ({
  useStorage: vi.fn(),
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function createPetState(overrides: Partial<PetState> = {}): PetState {
  const now = new Date();
  return {
    id: 'pet-1',
    name: 'Momo',
    hunger: 50,
    happiness: 70,
    health: 100,
    level: 1,
    experience: 0,
    stage: 'egg',
    createdAt: now,
    lastFedAt: now,
    lastInteractedAt: now,
    lastDecayCalculatedAt: now,
    isVisible: true,
    isMinimized: false,
    position: { x: 80, y: 80 },
    minimizedPosition: { x: 92, y: 2 },
    ...overrides,
  };
}

describe('usePetDomain real pet-logic composition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies two hours of real decay before persisting a loaded pet', async () => {
    const savedPet = createPetState({
      lastDecayCalculatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });
    const storage = createLocalStorageMock({
      getPetState: vi.fn(async () => savedPet),
      savePetState: vi.fn(async () => undefined),
    });
    vi.mocked(useStorage).mockReturnValue(storage);

    const { result } = renderHook(() => usePetDomain());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.pet).toMatchObject({
      hunger: 54,
      happiness: 68,
      health: 100,
    });
    expect(storage.savePetState).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'pet-1',
        hunger: 54,
        happiness: 68,
        health: 100,
      }),
    );
  });

  it('composes the real reward, level threshold, evolution, and persisted state', async () => {
    const savedPet = createPetState({ experience: 95, stage: 'egg' });
    const storage = createLocalStorageMock({
      getPetState: vi.fn(async () => savedPet),
      savePetState: vi.fn(async () => undefined),
    });
    vi.mocked(useStorage).mockReturnValue(storage);
    const { result } = renderHook(() => usePetDomain());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let reward: TaskCompletionReward | null = null;
    await act(async () => {
      reward = await result.current.onTaskCompleted(10, true);
    });

    expect(reward).toEqual({
      xpGained: 11,
      hungerReduced: 3.3,
      happinessGained: 5,
      leveledUp: true,
      evolved: true,
      newLevel: 2,
      newStage: 'baby',
    });
    expect(result.current.pet).toMatchObject({
      hunger: 46.7,
      happiness: 75,
      experience: 6,
      level: 2,
      stage: 'baby',
    });
    expect(storage.savePetState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hunger: 46.7,
        happiness: 75,
        experience: 6,
        level: 2,
        stage: 'baby',
      }),
    );
  });
});
